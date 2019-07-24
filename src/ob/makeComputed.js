import ob from './ob.js'
import {
  defineReactive,
} from './observe'
import {
  defineValue,
  noop,
  isFunction
} from './util'
import {
  WATCHERS_PROPERTY_NAME
} from './constants'
function reactive (vm, data) {
  if (!data) return
  let reactiveData = data
  if (typeof data === 'function') {
    reactiveData = data()
  }
  Object.keys(reactiveData).forEach(key => {
    defineReactive(vm, key, vm[key])
  })
}
export default function makeComputed (vm, computed, config) {
  reactive(vm, config['data'])
  reactive(vm, config['public'])
  reactive(vm, config['protected'])
  reactive(vm, config['private'])
  defineValue(vm, WATCHERS_PROPERTY_NAME, [], false)
  Object.keys(computed).forEach(key => {
    vm.$set(key, '')
    const descriptor = Object.getOwnPropertyDescriptor(vm, key)
    const getterOrAccessor = computed[key]
    let setter, getter
    if (isFunction(getterOrAccessor)) {
      getter = getterOrAccessor
      setter = noop
    } else {
      getter = getterOrAccessor.get
      setter = getterOrAccessor.set ? getterOrAccessor.set.bind(vm) : noop
    }
    Object.defineProperty(this, key, {
      configurable: true,
      enumerable: true,
      get: descriptor.get,
      set: setter
    })
    descriptor.set.call(vm, getter.call(vm))
    ob.watche(vm, getter, (val, oldVal) => {
      if (val === oldVal) return
      descriptor.set.call(vm, val)
      console.log(key, val, oldVal)
    }, {
      deep: true,
      lazy: false,
      sync: true,
    })
  })
}
