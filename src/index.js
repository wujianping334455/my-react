import React from './react';

class SubCount extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            old : true
        }  
    }
    componentDidMount(){
        setTimeout(() => {
            this.setState({
                old : !this.state.old
            })
        },1000)
    }
    render() {
        if(this.state.old){
            return React.createElemet('ul', {id: 'oldCount'}, 
                React.createElemet('li', { key: 'A'}, 'A'),
                React.createElemet('li', { key: 'B'}, 'B'),
                React.createElemet('li', { key: 'C'}, 'C'),
                React.createElemet('li', { key: 'D'}, 'D')
            )
        } else {
            return React.createElemet('ul', {id: 'newCount'}, 
                React.createElemet('span', { key: 'A'}, 'A1'),
                React.createElemet('li', { key: 'C'}, 'C1'),
                React.createElemet('li', { key: 'B'}, 'B1'),
                React.createElemet('li', { key: 'E'}, 'E1'),
                React.createElemet('li', { key: 'F'}, 'F1')
            )
        }
    }
}
// let element = <div name="1">hello<span>123</span></div>   --> React.createElemet('div',{ name: "1"}, "hello", React.createElemet('span',{}, "123" ) )
class Counter extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            number : 1
        }
    }
    componentWillMount(){
        console.log('Counter组件即将挂载')
    }
    componentDidMount(){
        console.log('Count组件挂载完成')
    }
    shouldComponentUpdate(preProps, nextProps){
        return true
    }
    componentDidUpdate(){
        console.log('Count组件更新完成')  
    }

    handleClick = () => {
        this.setState({ number: this.state.number + 1 })
    }

    render() {
        let p = React.createElemet('p', { style: { color: `${this.state.number % 2 === 0 ? 'blue' : 'red'}`}}, this.state.number)
        let button = React.createElemet('button', { onClick: this.handleClick }, '+')
        return React.createElemet('div', { style: { backgroundColor: `${this.state.number % 2 === 0 ? 'red' : 'blue'}` } }, p, button)
    }
}

// jsx语法
React.render(React.createElemet(SubCount, {name: 'wjp'}), document.getElementById('root'))