(function(){

function $(selector, context) {
  return (context || document).querySelector(selector)
}

$.all = function (selector, context) {
  return Array.prototype.slice.call(
    (context || document).querySelectorAll(selector)
  )
}

var State = {
  initial: {
    translate: [0,0,0],
    rotate: [0,0,0],
    scale:[1,1,1]
  },
  copy: function (state) {
    return {
      translate: state.translate.slice(),
      rotate: state.rotate.slice(),
      scale: state.scale.slice()
    }
  },
  diff: function (prev, next) {
    function differ(type) {
      return function (t, i) {
        return t - prev[type][i]
      }
    }
    return {
      translate: next.translate.map(differ('translate')),
      rotate: next.rotate.map(differ('rotate')),
      scale: next.scale.map(differ('scale'))
    }
  }
}

var UI = {}

UI.Editor = function (timeline) {
  this.timeline = timeline
  this.init()
}

UI.Panel = function (type, content) {
  this.type = type
  this.content = content
}

UI.Panel.prototype.toString = function () {
  return '<div class="panel panel_' + this.type + '">\
  <div class="panel__bg"></div>\
  <div class="panel__controls">' + this.content + '</div>\
  </div>'
}

UI.Timeline = function (max) {
  this.max = max || 5000
}

UI.Timeline.prototype.toString = function () {
  return '<input type="button" value="keyframe">\
    <input type="range" value="0" max="' + this.max + '">\
    <input type="button" value="code" class="code">'
}

UI.Controls = function () {
  this.config = {
    translate: {
      step: 1
    },
    rotate: {
      step: 1
    },
    scale: {
      step: .1
    }
  }
}

UI.Controls.prototype.toString = function () {
  var this_ = this
  return Object.keys(this.config).map(function (t) {
    return '<div class="' + t + '"><span>' + t + '</span>' + 
      ['x','y','z'].map(function (a) {
        return '<input type="text" value="' + (t === 'scale' ? 1 : 0) + '" \
            data-step="' + this_.config[t].step + '" data-transform="' + t + '" data-axis="'+ a +'">'
      }).join('') + '</div>'
  }).join('')
}

UI.Popup = function () {}

UI.Popup.prototype.toString = function () {
  return '<div class="popup"></div>'
}

UI.Popup.prototype.show = function (string) {
  $('.popup').textContent = string.replace(/([;{}])/g, '$1\n')
  $('.popup').style.display = 'block'
}

UI.Popup.prototype.hide = function () {
  $('.popup').style.display = 'none'
}

UI.Editor.prototype.init = function () {
  this.current = 0
  this.keyframes = []

  var this_ = this

  var container = document.createElement('div')

  this.popup = new UI.Popup

  container.innerHTML = new UI.Panel('right', new UI.Controls) + new UI.Panel('timeline', new UI.Timeline) + this.popup

  Array.prototype.slice.call(container.childNodes).forEach(function(div) {
    document.body.appendChild(div)
  })

  this.timeline.on('update', function (time) {
    $('.panel_timeline input[type=range]').value = time

    !['translate','rotate','scale'].forEach(function(t){
      ['x','y','z'].forEach(function(a, i) {
        $('.panel_right input[data-transform='+ t +'][data-axis="' + a + '"]')
          .value = this_.timeline.items[this_.current].state[t][i]
      })
    })
  }.bind(this))

  $('.panel_timeline input[type=range]').addEventListener('change', function () {
    this_.timeline.seek(this.value)
  }, false)

  $('.panel_timeline input[type=button]').addEventListener('click', function () {
    this_.keyframe(this_.timeline.currentTime)
  }, false)

  $('.panel_timeline .code').addEventListener('click', function () {
    this_.stringify(this_.timeline.items[this_.current])
  }, false)

  $.all('.panel_right input[type=text]').forEach(function(range){
    range.addEventListener('keydown', function (e) {
      e.preventDefault();
      var prev = parseFloat(this.value),
          step = parseFloat(this.dataset['step'])
      switch (e.keyCode) {
        case 37: // left
          this.value = prev - step
          break
        case 38: // up
          this.value = prev + 10 * step
          break
        case 39: // right
          this.value = prev + step
          break
        case 40: // down
          this.value = prev - 10 * step
          break
      }
      this_.timeline.items[this_.current].state[this.dataset['transform']]
        [['x','y','z'].indexOf(this.dataset['axis'])] = this.value
    }, false)
  })
}

UI.Editor.prototype.keyframe = function (time) {
  var index = this.current,
      keyframes = this.keyframes,
      item = this.timeline.items[this.current],
      state = State.copy(item.state)

  keyframes[index] || (keyframes[index] = [])
  keyframes[index].push({time: time, state: state})
  keyframes[index] = keyframes[index].sort(function(a, b) { return a.time - b.time })

  this.animate(item)
  item.state = State.copy(state)
}

UI.Editor.prototype.animate = function (item) {
  item.stop()
  item.clear()

  var index = this.current,
      prevState = State.initial,
      prevTime = 0

  this.keyframes[index].forEach(function(frame) {
    item.animate(State.diff(prevState, frame.state), frame.time - prevTime)
    prevState = State.copy(frame.state)
    prevTime = frame.time
  })
}

UI.Editor.prototype.stringify = function (item) {
  item.clear()
  this.popup.show(item.css(true).keyframes('animation'))
}

anima.editor = function () {
  var timeline = anima.timeline()
  timeline.add($('.viewport div'))
  new UI.Editor(timeline)
}

}())
