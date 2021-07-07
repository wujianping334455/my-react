/**
 * @description 父组件，提供setState方法
 */
class Component {
    constructor(props){
        this.props = props
    }
    /**
     * @description 更新组件状态
     * @param {*} partialState 
     */
    setState(partialState) {
        // 第一个参数是新元素，第二个参数是新状态
        this._currentUnit.update(null, partialState)
    }
}

export default Component