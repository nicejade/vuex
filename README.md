# quickapp-vuex

> Centralized State Management for quickapp.
> 移植了vuex到快应用，支持了几乎所有的功能，支持computed, watch, methods

支持度： 目前测试了部分手机，1010及1010以上都支持

魅族 | 华为 | 小米 | OPPO


- [What is Vuex?](https://vuex.vuejs.org/)
- [Full Documentation](http://vuex.vuejs.org/)

使用前请先学习Vuex

安装
```
npm install quickapp-vuex -S
```

store.js
```
import Vuex from 'quickapp-vuex'
import createLogger from 'quickapp-vuex/plugins/logger'

export default new Vuex.Store({
  state: {
    count: 1
  },
  getters: {
    count (state) {
      return state.count
    }
  },
  mutations: {
    increment (state) {
      state.count ++
    },
    decrement (state) {
      state.count --
    }
  },
  plugins: [createLogger()]
})
```

app.ux  只在入口处引入store.js，并挂到全局对象上，确保store只实例化一次
```
import store from 'path to store.js'
import Vuex from 'quickapp-vue'

Vuex.install(store)
```

组件和页面中使用， 需要包一层Vuex.Component，其他的和vuex用发类似
```
<template>
    <div class="counter">
        <text class="title">{{count}}</text>
        <input class="btn" type="button" value="+" onclick="increment" />
        <input class="btn" type="button" value="-" onclick="decrement" />
    </div>
</template>

<script>
import {mapGetters, mapMutations, Component} from 'quickapp-vue'
export default Component({
  computed: {
    ...mapGetters(['count'])
  },
  methods: {
    ...mapMutations(['increment', 'decrement'])
  }
})
</script>
```

computed 和 vue 一样支持function和 {get, set}

watch, 调用快应用的原生$watch，支持值为function, 不用绞尽脑汁想函数名了😂

```
export default Vuex.Component({
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

[MIT](http://opensource.org/licenses/MIT)
