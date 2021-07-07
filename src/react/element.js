/**
 * @description 父元素 - 处理type 和 props
 */
class Element{
    constructor(type, props){
        this.type = type
        this.props = props
    }
}

/**
 * @description 工厂函数 - 创建react元素
 * @param { String } type
 * @param { Object } props
 * @param { ReactElement } children
 */
function createElemet(type, props, ...children) {
    props = props || {}
    props.children = children
    return new Element(type, props)
}

export {
    Element,
    createElemet
}