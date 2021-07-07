import $ from 'jquery'
import createReactUnit from './unit'
import { createElemet } from './element'
import Component from './componet'

let React = {
    render,
    nextRootIndex: 0,
    createElemet,
    Component
}
/**
 * 渲染html元素
 * 根据虚拟dom树（jsx转化之后的reactElement的js对象）转化成html字符串元素
 * 然后渲染到对应的dom节点上
 * @param {ReactElement} element 
 * @param {Document} container 
 */
function render(element, container){
    // 工厂函数 - 创建react元素实例
    let createReactUnitInstance = new createReactUnit(element)
    // 从react实例上获得根节点的html元素
    let markUp = createReactUnitInstance.getMarkUp(React.nextRootIndex)
    // 挂载html到dom节点上
    $(container).html(markUp)
    // 触发挂载完成方法 - 发射方法
    $(document).trigger('mounted') // 所有组件都渲染完成
}

export default React
