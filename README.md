<p align="center"><a href="https://forum.lovejade.cn/d/142-vuex?utm_source=github.com" target="_blank"><img width="640"src="https://lovejade.oss-cn-shenzhen.aliyuncs.com/quickapp-x-vuex.png"></a></p>


<h1 align="center">VUEX FOR QUICKAPP</h1>

<div align="center">
  <strong>
    快应用开发的状态管理（State management for quickapp development）.
  </strong>
</div>

<br>

<div align="center">
  <a href="https://nodejs.org/en/">
    <img src="https://img.shields.io/badge/node-%3E%3D%208.0.0-green.svg" alt="Node Version">
  </a>
  <a href="https://www.npmjs.com/package/qa-vuex">
    <img src="https://img.shields.io/npm/v/qa-vuex" alt="qa-vuex">
  </a>
  <a href="https://github.com/nicejade/vuex">
    <img src="https://img.shields.io/github/license/nicejade/arya-jarvis" alt="LICENSE">
  </a>
  <a href="https://forum.lovejade.cn/d/142-vuex">
    <img src="https://img.shields.io/badge/chat-on%20blog-brightgreen.svg" alt="Quickapp Vuex">
  </a>
  <a href="https://weibo.com/jeffjade">
    <img src="https://img.shields.io/badge/WeiBo-jeffjade-red.svg?style=flat" alt="Quickapp Vuex">
  </a>
  <a href="https://aboutme.lovejade.cn/?utm_source=github.com">
    <img src="https://img.shields.io/badge/Author-nicejade-%23a696c8.svg" alt="Author nicejade">
  </a>
</div>

## 目标与理念

[快应用](https://nicelinks.site/post/5b5fb5bc615bf842b609105f)是基于手机硬件平台的新型应用形态，标准是由主流手机厂商组成的`快应用联盟`联合制定。其标准的诞生将在研发接口、能力接入、开发者服务等层面建设标准平台，以平台化的生态模式对个人开发者和企业开发者全品类开放。[快应用](https://nicelinks.site/post/5b5fb5bc615bf842b609105f)具备传统 APP 完整的应用体验，`无需安装、即点即用`；`覆盖 10 亿设备`，`与操作系统深度集成，探索新型应用场景`。快应用 ── **复杂生活的简单答案，让生活更顺畅**。

[快应用](https://nicelinks.site/post/5b5fb5bc615bf842b609105f)语法本身提供[兄弟跨级组件通信](https://doc.quickapp.cn/tutorial/framework/parent-child-component-communication.html#兄弟跨级组件通信)、全局变量、[props](https://doc.quickapp.cn/tutorial/framework/props.html) 等能力；但不同程度上，都存在些许问题：

1. 开发者实现 Pub/Sub（订阅）模型：虽然完成了解耦，但操作繁琐；
2. 利用框架本身提供的事件绑定接口：耦合性高，不够扁平化，难以维护；

如果您考虑通过`全局变量`以及 props 跨层级传递的方式，但其弊端相对会更多。在某些复杂业务场景，采取**状态模型**，基于事件操作驱动数据，基于数据变化更新界面；最合适不过了。在众多状态机相关类库中，有开发者对 vuex 进行了快应用适配：[quickapp-vuex](https://github.com/dyw934854565/vuex)（**支持了几乎所有的功能，支持 computed, watch, methods**）。因此您的快应用项目，可运用 vuex 进行状态管理，用以**解决「兄弟跨级组件通信问题」**，同时，**降低代码之间的耦合性**。在使用 [quickapp-vuex](https://github.com/dyw934854565/vuex) 时，有发现基于 `data` 和 `getters` 皆不能使用数组（前者会导致报错，后者则陷入死循环），使得运用起来稍显不够顺畅；因此有 fork 出来——[qa-vuex](https://github.com/nicejade/vuex)，对其做了解决，以便开发者可更灵活运用。

- 支持度： 目前测试了部分手机，1010 及其以上都支持；
- 支持机型：vivo  |  魅族  |  华为  |  小米  |  OPPO 等；
## 如何安装

```bash
yarn add qa-vuex
// OR
npm install qa-vuex -S
```
## 如何使用

如果您尚不了解 [Vuex](https://vuex.vuejs.org/)，还请先学习下。您也可以参见开源项目：[quickapp-vuex-sample](https://github.com/vivoquickapp/quickapp-vuex-sample)。如您需要了解更多，请参见文章：[如何在快应用开发中使用 vuex 做状态管理](https://forum.lovejade.cn/d/142-vuex)。

```js
// store.js
import Vuex from 'qa-vuex'
import createLogger from './../../node_modules/quickapp-vuex/plugins/logger'

export default new Vuex.Store({
  state: {
    count: 1314,
    recordArr: []
  },
  getters: {
    count (state) {
      return state.count
    },
    recordArr () {
      return state.recordArr
    }
  },
  mutations: {
    increment (state) {
      state.recordArr.push(state.count)
      state.count ++
    },
    decrement (state) {
      state.recordArr.push(state.count)
      state.count --
    }
  },
  plugins: [createLogger()]
})
```

在 `app.ux` 入口文件，引入 store.js，并挂到全局对象上，确保 store 只实例化一次。

```js
// app.ux
import store from './store/store.js'
import Vuex from 'qa-vuex'

Vuex.install(store)
```

组件和页面中使用， 需要包一层 Vuex.Component，其他的和 vuex 用发类似。

```html
<template>
  <div class="counter">
    <text class="title">{{count}}</text>
    <input class="btn" type="button" value="+" onclick="increment" />
    <input class="btn" type="button" value="-" onclick="decrement" />
  </div>
</template>

<script>
import { mapGetters, mapMutations, Component } from 'qa-vuex'

export default Component({
  computed: {
    ...mapGetters(['count', 'recordArr'])
  },
  methods: {
    ...mapMutations(['increment', 'decrement'])
  }
})
</script>
```

computed 和 vue 一样支持 function 和 { get, set }；

watch, 调用快应用的原生 `$watch`，支持值为 function。

```js
import { Component } from 'qa-vuex'

export default Component({
  props: {
    title: String
  },
  watch: {
    title: function (newVal, oldVal) {
      console.log(newVal, oldVal)
    }
  }
})
```

## License

[MIT](http://opensource.org/licenses/MIT) Copyright (c) 2015-present Evan You, duanyuwen, nicejade
