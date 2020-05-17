/**
 * Created by Liu.Jun on 2020/4/24 11:23.
 */

import vueProps from '../props';

import {
    allowAdditionalItems, getDefaultFormState, isFixedItems, isMultiSelect
} from '../../common/schemaUtils';

import { getPathVal, setPathVal } from '../../common/vueUtils';

import Widget from '../../fieldComponents/Widget';

import * as arrayMethods from '../../common/arrayUtils';

import ArrayFieldNormal from './arrayTypes/ArrayFieldNormal';
import ArrayFieldMultiSelect from './arrayTypes/ArrayFieldMultiSelect';
import ArrayFieldTuple from './arrayTypes/ArrayFieldTuple';

export default {
    name: 'ArrayField',
    props: vueProps,
    computed: {
        itemsFormData() {
            // todo: key formData ?
            // 直接使用 index 做 id 来循环了
            // 理想状态数组需要使用唯一id，处理数组结构①到②的转换 如：① [value1, value2 ] =>  ② [{id: key1, value: value1}, {id: key2, value: value2}]
            // return getPathVal(this.rootFormData, this.curNodePathArr).map(item => ({
            //     key: genId(),
            //     value: item
            // }));

            return getPathVal(this.rootFormData, this.curNodePathArr);
        }
    },
    methods: {
        // 获取一个新item
        getNewFormDataRow() {
            const { schema, rootSchema } = this.$props;
            let itemSchema = schema.items;

            // https://json-schema.org/understanding-json-schema/reference/array.html#tuple-validation
            // 数组为项的集合搭配additionalItems属性需要特殊处理
            if (isFixedItems(this.schema) && allowAdditionalItems(this.schema)) {
                itemSchema = schema.additionalItems;
            }
            return getDefaultFormState(itemSchema, undefined, rootSchema);
        },

        // 数组排序相关操作
        handleArrayOperate({
            command,
            data
        }) {
            // 统一处理数组数据的 新增，删除，排序等变更
            const strategyMap = {
                moveUp(target, { index }) {
                    return arrayMethods.moveUpAt(target, index);
                },
                moveDown(target, { index }) {
                    return arrayMethods.moveDownAt(target, index);
                },
                remove(target, { index }) {
                    return arrayMethods.removeAt(target, index);
                },
                add(target) {
                    const newFormDataRow = this.getNewFormDataRow();
                    target.push(newFormDataRow);
                },
                batchPush(target, { pushArray }) {
                    pushArray.forEach((item) => {
                        target.push(item);
                    });
                },
                setNewTarget(target, { newTarget }) {
                    setPathVal(this.rootFormData, this.curNodePathArr, newTarget);
                }
            };

            const curStrategy = strategyMap[command];
            if (curStrategy) {
                curStrategy.apply(this, [this.itemsFormData, data]);
            } else {
                throw new Error(`错误 - 未知的操作：[${command}]`);
            }
        }
    },
    render(h) {
        const self = this;
        const {
            schema,
            rootSchema,
            rootFormData,
            curNodePathArr,
        } = this.$props;

        if (!schema.hasOwnProperty('items')) {
            throw new Error(`[${this.curNodePathArr[this.curNodePathArr.length - 1]}] 字段请先定义 items属性`);
        }

        // https://json-schema.org/understanding-json-schema/reference/array.html#list-validation
        let CurrentField = ArrayFieldNormal;

        if (isFixedItems(schema)) {
            // https://json-schema.org/understanding-json-schema/reference/array.html#tuple-validation
            CurrentField = ArrayFieldTuple;

        } else if (isMultiSelect(schema, rootSchema)) {
            // item 为枚举固定值
            CurrentField = ArrayFieldMultiSelect;
        }

        return h('div', [
            h(CurrentField, {
                props: {
                    itemsFormData: this.itemsFormData,
                    ...this.$props,
                },
                class: {
                    [CurrentField.name]: true
                },
                on: {
                    onArrayOperate: this.handleArrayOperate
                }
            }),

            // 插入一个Widget，校验 array - maxItems. minItems. uniqueItems 等items外的属性校验
            h(Widget, {
                class: {
                    ArrayField_valid: true
                },
                style: {
                    marginTop: '5px',
                    marginBottom: 0
                },
                props: {
                    schema: Object.entries(self.$props.schema).reduce((preVal, [key, value]) => {
                        if (key !== 'items') preVal[key] = value;
                        return preVal;
                    }, {}),
                    errorSchema: this.errorSchema,
                    // widget: '',
                    curNodePathArr,
                    required: this.required,
                    rootFormData
                }
            })
        ]);
    }
};