import { Element } from './element'
import $ from "jquery"
import types from './types'

let diffQueue = [];  // 差异队列
let updateDepth = 0; // 更新的层级

/**
 * @description 基类 - 创建react实例
 */
class Unit {
    constructor(element){
        this._currentElement = element
    }
}

/**
 * @description html原生标签类 - 创建html原生标签实例
 */
class ReactNativeUnit extends Unit {
    /**
     * @description 获得html元素
     * @param {String} reactid 
     * @returns markUp
     */
    getMarkUp(reactid){
        this._reactid = reactid
        this._renderChildrenUnits = []
        // 拼接需要渲染的内容
        let { type, props } = this._currentElement // div name  reactid
        let tagStart = `<${type} data-reactid='${this._reactid}'`
        let tagEnd = `</${type}>`
        let contentStr = '';
        // 拼接props中的属性
        for (const propName in props) {
            // 处理事件 - jquery 事件委托 - react里面的事件绑定也是同理
            if(/on[A-Z]/.test(propName)){
                let eventName = propName.slice(2).toLowerCase()
                // $(document).on(eventName, `[data-reactid ='${this._reactid}']`, props[propName])
                $(document).delegate(`[data-reactid ='${this._reactid}']`,`${eventName}.${this._reactid}`,props[propName])
            }else if(propName === 'style'){// 处理style
                let styleObj = props[propName]
                let styles = Object.entries(styleObj).map(([attr, value]) => {
                    return `${attr.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${value}`
                }).join(';')
                tagStart += `style="${styles}"`
            }else if(propName === 'className'){// 处理className
                tagStart += `class="${props[propName]}"`
            }else if (propName === 'children') {// 处理子组件
                let childEle = props[propName]
                if(typeof childEle === 'string'){
                    childEle = [childEle]
                }
                // 递归子节点
                contentStr += childEle.map((child, idx) => {
                    let childUnit = createReactUnit(child)
                    // 给每一个节点一个_mountIndex，用于指向他在父节点的位置
                    childUnit._mountIndex = idx
                    // 缓存子节点的实例
                    this._renderChildrenUnits.push(childUnit)
                    // 返回子元素的拼接的数组
                    return childUnit.getMarkUp(`${this._reactid}.${idx}`)
                }).join('')
            } else {
                tagStart += `${propName}='${props[propName]}'`
            }
        }
        return tagStart + '>' + contentStr + tagEnd
    }
    /**
     * @description 更新方法 - 更新dom
     * @param {ReactElement} nextElement 
     */
    update(nextElement) {
        // 老的属性
        let oldProps = this._currentElement.props
        // 新的属性
        let newProps = nextElement.props
        // 更新属性
        this.updateDOMProperties(oldProps, newProps)
        // 更新儿子
        this.updateDOMChildren(newProps.children)
    }
    /**
     * @description 更新dom - 更新DOM属性的方法 
     * @param {Object} oldProps
     * @param {Object} newProps 
     */
    updateDOMProperties(oldProps, newProps) {
        let propName;
        // 遍历老属性 - 去除多余属性
        for (propName in oldProps) {
            // 删除多余的属性
            if (newProps.hasOwnProperty(propName)) {
                $(`[data-reactid="${this._reactid}"]`).removeAttr(propName)
            }
            // 取消多余事件绑定
            if(/on[A-Z]/.test(propName)){
                $(document).undelegate(`.${this._reactid}`)
            }
        }
        // 遍历新属性 - 增加新属性
        for (propName in newProps) {
            // 如果是儿子属性，先不处理，只处理本身属性
            if(propName === 'children'){
                continue
            }
            // 重新绑定事件
            else if(/on[A-Z]/.test(propName)) {
                let eventName = propName.slice(2).toLowerCase()
                $(document).delegate(`[data-reactid ='${this._reactid}']`,`${eventName}.${this._reactid}`,newProps[propName])
            }
            // 删除多余的属性
            else if (propName === 'style') {
                // $(`[data-reactid="${this._reactid}"]`).removeAttr(propName)
                let styleObj = newProps[propName]
                Object.entries(styleObj).map(([attr, value]) => {
                    return $(`[data-reactid="${this._reactid}"]`).css(attr, value)
                })
            }
            // 处理className
            else if(propName === 'className'){
                // $(`[data-reactid="${this._reactid}"]`).addClass(propName, newProps[propName])
                $(`[data-reactid="${this._reactid}"]`).attr('class', newProps[propName])
            }
            // 普通属性
            else {
                $(`[data-reactid="${this._reactid}"]`).prop(propName, newProps[propName])
            }
        }
    }
    /**
     * @description 更新儿子们的dom - 更新儿子们，新的儿子们和老的儿子们对比，找出差异
     * @param {ReactElement} newChildrenElement 
     */
    updateDOMChildren(newChildrenElement) {
        // 层级增加 - 每次进入递归都会增加
        updateDepth++
        // diff算法，计算出本元素以及子元素（这里面需要递归，子元素的子元素。。。逐级计算）中需要更新、新增，去除的元素
        this.diff(diffQueue, newChildrenElement)
        // 层级减少 - 每次退出diff都会时间少
        updateDepth--
        // 每进行一次diff,都表示进入更深一层次，执行完diff,则要进入上一层次,当为0时，则表示diff完成
        if(updateDepth === 0){
            // 更新dom
            this.patch(diffQueue)
            // 更新完成后，清空diffQueue
            diffQueue = []
        }
    }
    /**
     * @description diff算法 - 计算出子元素中需要更新，去除，新增的元素
     * @param {Array} diffQueue 
     * @param {ReactElement} newChildrenElement
     */
    diff(diffQueue, newChildrenElement) {
        // 生成第一个map,key等于老的unit
        let oldChildrenMap = this.getOldChildrenMap(this._renderChildrenUnits)
        // 生成新的儿子unit数组
        let [newChildrenUnitsMap, newChildren] = this.getNewChildrenMap(oldChildrenMap, newChildrenElement)
        // 上一个已经确定位置的索引
        let lastIndex = 0
        newChildren.forEach((unit, i) => {
            let newKey = ((unit._currentElement.props && unit._currentElement.props.key) || i).toString()
            let oldUnit = oldChildrenMap[newKey]
            // 如果新老一致的话，则可以复用老的节点
            if(oldUnit === unit){
                if(oldUnit._mountIndex < lastIndex){
                    diffQueue.push({
                        parentId: this._reactid,
                        parentNode: $(`[data-reactid="${this._reactid}"]`),
                        type: types.MOVE,
                        fromIndex: oldUnit._mountIndex,
                        toIndex: i
                    })
                }
                lastIndex = Math.max(lastIndex, oldUnit._mountIndex)
            } else {// 不相等，则
                if(oldUnit){
                    // Key相同，但是两个元素对象不相等，则删除老的
                    diffQueue.push({
                        parentId: this._reactid,
                        parentNode: $(`[data-reactid="${this._reactid}"]`),
                        type: types.REMOVE,
                        fromIndex: oldUnit._mountIndex
                    })
                    $(document).undelegate(`.${oldUnit._reactid}`)
                }
                diffQueue.push({
                    parentId: this._reactid,
                    parentNode: $(`[data-reactid="${this._reactid}"]`),
                    type: types.INSERT,
                    toIndex: i,
                    markUp: unit.getMarkUp(`${this._reactid}.${i}`)
                })
            }
            unit._mountIndex = i
        })
        // 遍历老虚拟dom节点
        for (const oldKey in oldChildrenMap) {
            const oldUnit = oldChildrenMap[oldKey];
            // 新的集合里面不包含老的节点-则需删除
            if (!newChildrenUnitsMap.hasOwnProperty(oldKey)) {    
                diffQueue.push({
                    parentId: this._reactid,
                    parentNode: $(`[data-reactid="${this._reactid}"]`),
                    type: types.REMOVE,
                    fromIndex: oldUnit._mountIndex
                })
                // 过滤老的需要删除的元素 - 删除掉对应的unit
                this._renderChildrenUnits = this._renderChildrenUnits.filter((item)=>item !== oldUnit)
                // 去掉对应的事件
                $(document).undelegate(`.${oldUnit._reactid}`)
            }
        }
    }
    /**
     * @description 获取老元素child实例对象map
     * @param {Array} childrenUnits
     * @returns {Object} map
     */
    getOldChildrenMap(childrenUnits = []){
        let map = {}
        for (let i = 0; i < childrenUnits.length; i++) {
            const unit = childrenUnits[i];
            let key = ((unit._currentElement.props && unit._currentElement.props.key) || i).toString()
            map[key] = unit
        }
        return map
    }
    /**
     * @description 获取新元素child实例对象map - 先找老集合，有就复用没有就新增
     * @param {Object} oldChildrenMap
     * @param {ReactElement} newChildrenElement 
     * @returns {Array[Array, Object]} [newChildrenUnitsMap,newChildren]
     */
    getNewChildrenMap(oldChildrenMap, newChildrenElement) {
        let newChildren = []
        let newChildrenUnitsMap = {}
        newChildrenElement.forEach((elem,i) => {
            let newKey = ((elem.props && elem.props.key) || i).toString()
            // 获取老unit
            let oldUnit = oldChildrenMap[newKey]
            // 获取老元素
            let oldElement = oldUnit && oldUnit._currentElement
            // 是否深度比较
            if(shouldDeepCompare(oldElement,elem)){
                // 进入子元素的递归 - 深度比较
                oldUnit.update(elem)
                newChildren.push(oldUnit)
                newChildrenUnitsMap[newKey] = oldUnit
            } else {
                // 创建子元素的实例
                let newUnit = createReactUnit(elem)
                newChildren.push(newUnit)
                newChildrenUnitsMap[newKey] = newUnit
                // 把父节点老的unit替换掉
                this._renderChildrenUnits[i] = newUnit
            }
        });
        return [newChildrenUnitsMap, newChildren]
    }
    /**
     * @description 更新dom - 根据diffQueue里面的元素更新dom
     * @param {Array} diffQueue 
     */
    patch(diffQueue){
        // 需要删除的
        let deleteChildren = []
        let deleteMap = {}
        // 找到移动或者需要删除的
        for (let i = 0; i < diffQueue.length; i++) {
            const diff = diffQueue[i];
            if(diff.type === types.MOVE || diff.type === types.REMOVE ){
                let fromIndex = diff.fromIndex
                // 获取老的节点
                let oldUnit = $(diff.parentNode.children().get(fromIndex))
                deleteChildren.push(oldUnit)
                if(!deleteMap[diff.parentId]){
                    deleteMap[diff.parentId] = {}
                }
                deleteMap[diff.parentId][fromIndex] = oldUnit
            }
        }
        // 删除多余的
        $.each(deleteChildren, (idx,item) => $(item).remove())
        // 新增节点
        for (let i = 0; i < diffQueue.length; i++) {
            const diff = diffQueue[i];
            switch(diff.type){
                case types.MOVE: 
                    this.insertChildAt(diff.parentNode, diff.toIndex, deleteMap[diff.parentId][diff.fromIndex])
                    break;
                case types.INSERT:
                    this.insertChildAt(diff.parentNode, diff.toIndex, $(diff.markUp))
                    break;
                default:
                    break 
            }
        }
    }
    // 新增节点
    insertChildAt(parentNode, index, childNode){
        // 在父节点下找到这个位置的节点
        let oldChild = parentNode.children().get(index)
        // 如果这个位置有元素，则将在插入在这个元素前面，如果没有就追加到父元素下最后一个元素
        oldChild?childNode.insertBefore(oldChild):childNode.appendTo(parentNode)
    }
}

/**
 * @description 文本类 - 渲染文本组件，element元素为number 或者 string类型时
 */
class ReactTextUnit extends Unit {
    /**
     * @description 获得html元素
     * @param {String} reactid 
     * @returns markUp
     */
    getMarkUp(reactid) {
        this._reactid = reactid
        return`<span data-reactid="${this._reactid}">${this._currentElement}</span>`
    }
    /**
     * @description 更新方法
     * @param {ReactElement} nextElement 
     */
    update(nextElement) {
        if (this._currentElement !== nextElement) {
            this._currentElement = nextElement
            $(`[data-reactid ='${this._reactid}']`).html(nextElement)
        }   
    }
}

/**
 * @description react复合组件类 - 渲染react复合组件
 */
class ReactCompositUnit extends Unit {
    /**
     * @description 更新方法
     * @param {ReactElement} newElement 
     * @param {Object} partialState 
     */
    update(newElement, partialState){
        // 处理元素
        this._currentElement = newElement || this._currentElement
        // TODO:[判断是否合并更新，isPatchUpdate]
        // 合并状态 - 不管是否更新组件，组件状态一定会修改
        let nextState = this._componetInstance.state = Object.assign(this._componetInstance.state, partialState)
        // 新属性
        let nextProps = this._componetInstance.props
        // 询问组件是否要更新
        if(this._componetInstance.shouComponentUpdate && !this._componetInstance.shouComponentUpdate(nextProps, nextState)){
            return
        }
        // 上次渲染的实例
        let preRenderUnitInstance = this._renderUnitInstance
        // 上次的渲染的元素
        let preRenderElement = preRenderUnitInstance._currentElement
        // 获取本次渲染的元素
        let nextRenderElement = this._componetInstance.render()
        // 是否进行深度比较 - 如果类型一样就进行深度比较
        if(shouldDeepCompare(preRenderElement, nextRenderElement)){
            // 把更新交给上次渲染的元素
            preRenderUnitInstance.update(nextRenderElement)
            this._componetInstance.componentDidUpdate && this._componetInstance.componentDidUpdate()
        } else {// 新建新元素
            preRenderUnitInstance = createReactUnit(nextRenderElement)
            let nextMarkUp = this._renderUnitInstance.getMarkUp(this._reactid)
            $(`[data-reactid ='${this._reactid}']`).replaceWith(nextMarkUp)
        }
    }
    /**
     * @description 获得html元素
     * @param {String} reactid 
     * @returns markUp
     */
    getMarkUp(reactid) {// 保存当前元素
        this._reactid = reactid
        let { type: Component, props } = this._currentElement
        let componetInstance = this._componetInstance = new Component(props)
        // 渲染前方法
        componetInstance.componentWillMount && componetInstance.componentWillMount()
        // 让组件的实例的属性_currentUnit等于当前的unit
        componetInstance._currentUnit = this
        // 调用render方法得到需要渲染的元素
        let reactComponetRender = componetInstance.render()
        // 递归渲染组件
        let renderUnitInstance = this._renderUnitInstance = createReactUnit(reactComponetRender)
        // 将自定义组件转化为html标签返回
        let markUp = renderUnitInstance.getMarkUp(this._reactid)
        // 在递归后绑定的事件，子组件先绑定，父组件后绑定
        $(document).on('mounted', () => {
            componetInstance.componentDidMount && componetInstance.componentDidMount()
        })
        return markUp
    }
}
/**
 * @description 判断是否进行深比较
 * @param {ReactElement} preRenderElement 
 * @param {ReactElement} nextRenderElement 
 */
function shouldDeepCompare(preRenderElement, nextRenderElement){
    if(preRenderElement !== null && nextRenderElement !== null ){
        let preType = typeof preRenderElement
        let nextType = typeof nextRenderElement
        if((preType === 'number' || preType === 'string') && (nextType === 'number' || nextType === 'string')){
            return true
        }
        if(preRenderElement instanceof Element && nextRenderElement instanceof Element){
            return preRenderElement.type === nextRenderElement.type
        }
    }
    return false
}

/**
 * @description 工厂函数 - 创建react元素
 * @param {ReactElement} element 
 * @returns unit(react组件实例对象)
 */
function createReactUnit(element) {
    if( typeof element === 'string' || typeof element === 'number' ){
        return new ReactTextUnit(element)
    }
    if( element instanceof Element  && typeof element.type === 'string' ){
        return new ReactNativeUnit(element)
    }
    if( element instanceof Element && typeof element.type === 'function' ){
        return new ReactCompositUnit(element)
    } else {

    }
}

export default createReactUnit