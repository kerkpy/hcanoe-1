import moment from 'moment'
import {
  toMeters,
  toSeconds,
  displayPace,
  displayDistance,
  toHHMMSS,
} from '@utils/physics'
import { recentFirst } from '@utils/sort'

/*
 * Prettify Distance
 */
type Distance = Array<{
  Distance: string
  Timing: string
  Type: string
  Date: string
  Pace?: string
  best?: Array<number>
  si_distance?: number
  si_time?: number
  si_pace?: number
  SortDate?: number
}>

const prettifyDistance = (arr: Distance) => {
  const cat = [1000, 2400, 5000, 7000, 10000, 15000, 21000, 42195, 50000]
  const best_temp = Array(cat.length)
  arr.forEach((training) => {
    // Pace
    training.Pace = displayPace(training.Timing, training.Distance)
    const si_pace = toSeconds(training.Pace)
    // Distance
    const si_distance = toMeters(training.Distance)
    training.Distance = displayDistance(training.Distance, 'km')
    // Timings
    const si_time = toSeconds(training.Timing)
    training.Timing = toHHMMSS(training.Timing)
    // Check if best
    cat.forEach((e, i) => {
      if (si_distance >= cat[i]) {
        if (best_temp[i] === undefined) {
          training.best = []
          best_temp[i] = {
            id: si_time + si_distance + e,
            pace: si_pace,
          }
        } else {
          if (si_pace < best_temp[i].pace) {
            training.best = []
            best_temp[i] = {
              id: si_time + si_distance + e,
              pace: si_pace,
            }
          }
        }
      }
    })
    Object.assign(training, { si_pace, si_distance, si_time })
    const process_date = moment(training.Date, 'DD/MM/YYYY').unix()
    training.SortDate = process_date
  })
  const best_data = Array(cat.length)
  arr.forEach((training) => {
    cat.forEach((e, i) => {
      const this_id = training.si_time + training.si_distance + e
      if (best_temp[i] && this_id === best_temp[i].id) {
        training.best.push(cat[i])
        best_data[i] = training
      }
    })
  })
  arr.sort(recentFirst)
  return { best: best_data, arr, cat }
}

/*
 * Prettify Intervals
 */
type Intervals = Array<{
  Type: string
  Date: string
  Programme: Array<string>
  Paces: Array<string>
  SortDate?: number
  [propName: string]: any
}>

type BySets = Array<{
  Set?: string,
  Rest?: string,
  Timing?: string,
}>
const prettifyIntervals = (arr: Intervals) => {
  const isKeyWord = {
    Set: 1,
    Rest: 1,
    Timing: 1,
  }
  arr.forEach((training) => {
    // training is an object
    const by_sets: BySets = []
    for (const key in training) {
      const type = key.slice(0, -1)
      if (isKeyWord[type]) {
        const order = parseInt(key.slice(-1)) - 1
        if (typeof by_sets[order] === 'undefined') {
          by_sets[order] = {}
        }
        by_sets[order][type] = training[key]
      }
    }
    Object.assign(training, getIntervalsProgramme(by_sets))
    training.SortDate = moment(training.Date, 'DD/MM/YYYY').unix()
  })
  arr.sort(recentFirst)
  /*
   * expected input: an object
   *  - Set1: 800m
   *  - Set2: 800m
   *  - Set3: 800m
   *  - Rest1: 1:00
   *  - Rest2: 1:00
   *  - Rest3: 1:00
   *  - Timing1: 2:41
   *  - Timing2: 2:47
   *  - Timing3: 2:39
   *  - Date: 25/07/2021
   *
   *  expected output:
   *    3 x 800m / 1'      2:41, 2:47, 2:39
   *
   * if further sets are added:
   *  - Set4: 400m
   *  - Set5: 400m
   *  - Set6: 400m
   *  - Rest4: 0:30
   *  - Rest5: 0:30
   *  - Rest6: 0:30
   *  - Timing4: 1:22
   *  - Timing5: 1:25
   *  - Timing6: 1:21
   *
   *  new expected output:
   *    3 x 800m / 1', 3 x 400m / 30"          2:41, 2:47, 2:39, 1:22, 1:25, 1:21
   */
  return arr
}

/*
 * takes in [H]:MM:SS
 * returns M'/S"
 */
const quoteNotation = (str) => {
  const p = {}
  const colonCount = str.match(/:/g).length
  if (colonCount === 1) {
    p.sec = moment.duration('0:' + str).asSeconds()
  } else if (colonCount === 2) {
    p.sec = moment.duration(str).asSeconds()
  }
  p.MM = parseInt(p.sec / 60)
  p.SS = parseInt(p.sec % 60)
  if (p.SS == 0) {
    p.result = p.MM + "'"
  } else {
    p.result = p.MM + "'" + p.SS + '"'
  }
  return p.result
}

const mmssNotation = (str) => {
  const p = {}
  const colonCount = str.match(/:/g).length
  if (colonCount === 1) {
    p.sec = moment.duration('0:' + str).asSeconds()
  } else if (colonCount === 2) {
    p.sec = moment.duration(str).asSeconds()
  }
  p.MM = parseInt(p.sec / 60)
  p.SS = parseInt(p.sec % 60)
  p.result = p.MM + ':' + p.SS
  return p.result
}

const mmssToSeconds = (str) => {
  const p = {}
  const colonCount = str.match(/:/g).length
  if (colonCount === 1) {
    p.sec = moment.duration('0:' + str).asSeconds()
  } else if (colonCount === 2) {
    p.sec = moment.duration(str).asSeconds()
  }
  return p.sec
}

const secondsToMMSS = (int) => {
  const p = {}
  p.sec = moment.duration(int, 'seconds').asSeconds()
  p.MM = parseInt(p.sec / 60)
  p.SS = parseInt(p.sec % 60)
  p.result = p.MM + ':' + p.SS
  // console.log('input', int, 'output', p.result)
  return p.result
}

const getIntervalsProgramme = (d: BySets) => {
  console.log(d)
  /*
   * if first, skip
   * if in between,
   *    if same distance and time,
   *        2x800m/1' -> 3x800m/1'
   *    if different distance and same time,
   *        2x800m/1' -> 2x800m/1', 1x400m/1'
   *    if same distance and different time,
   *        2x800m/1' -> 2x800m/1', 1x800m/2'
   *    if different distance and different time,
   *        2x800m/1' -> 2x800m/1', 1x200m/2'
   * handle last
   */

  const Programme = []
  const Timings = []
  const Paces = []
  var c = 0
  type Mem = {
    Set?: string,
    Rest?: string,
    Timings?: Array<number>
  }
  var mem: Mem = {}
  function pushPaces(timings: Array<number>, distance: string) {
    Paces.push(
      displayPace(
        timings.reduce((a, b) => a + b, 0), // total timing in seconds
        toMeters(distance) * c // total distance in meters
      )
    )
  }
  function pushProgramme(c: number, distance: string, rest: string) {
    Programme.push(c + 'x' + distance + '/' + quoteNotation(rest))
  }
  d.forEach((e, index) => {
    const same = (type: string) => {
      if (d[index][type] === d[index - 1][type]) {
        return true
      }
      return false
    }

    if (index === 0) {
      // first element
      c += 1
      mem = {...mem, Set: e.Set, Rest: e.Rest}
      mem.Timings = [toSeconds(e.Timing)]
    } else if (index === d.length - 1) {
      // last element
      if (same('Set') && same('Rest')) {
        c += 1
        pushProgramme(c, mem.Set, mem.Rest)
        mem.Timings.push(toSeconds(e.Timing))
        Timings.push(mem.Timings.map((x) => toHHMMSS(x)))
        pushPaces(mem.Timings, mem.Set)
      } else {
        pushProgramme(c, mem.Set, mem.Rest)
        Timings.push(mem.Timings.map((x) => secondsToMMSS(x)))
        pushPaces(mem.Timings, mem.Set)
        Programme.push(1 + 'x' + e.Set + '/' + quoteNotation(e.Rest))
        Timings.push([toHHMMSS(e.Timing)])
        Paces.push(displayPace(mmssToSeconds(e.Timing), toMeters(e.Set)))
      }
    } else {
      // in between
      if (same('Set') && same('Rest')) {
        c += 1
        mem.Timings.push(toSeconds(e.Timing))
      } else {
        pushProgramme(c, mem.Set, mem.Rest)
        Timings.push(mem.Timings.map((x) => toHHMMSS(x)))
        pushPaces(mem.Timings, mem.Set)
        mem = {...mem, Set: e.Set, Rest: e.Rest}
        mem.Timings = [toSeconds(e.Timing)] // reset Timings in memory
      }
    }
  })
  return {
    Programme,
    Timings: Timings.map((x) => x.join(', ')),
    Paces
  }
}

const getOnOffProgramme = (d) => {
  const Programme = []
  var c = 0
  var mem = {
    On: '',
    Off: '',
    Dash: [],
    Train: false,
  }
  d.forEach((e, index) => {
    e.On = quoteNotation(e.On)
    e.Off = quoteNotation(e.Off)
    /*
     * e contains an object with On and Off props
     */
    const sameOn = () => {
      return d[index].On === d[index - 1].On ? true : false
    }
    const sameOff = () => {
      return d[index].Off === d[index - 1].Off ? true : false
    }
    const dashEmpty = () => {
      return mem.Dash.length === 0 ? true : false
    }
    const pushSet = () => {
      if (c === 1) {
        Programme.push(mem.On + '/' + mem.Off)
      } else {
        Programme.push(c + 'x' + mem.On + '/' + mem.Off)
      }
    }
    /*
     * expected output:
     *   7x7'/1'
     *   3x7'/1', 3x3'/1'
     *   7'-6'-5'-4'-3'-2'-1'/1'
     */
    if (index === 0) {
      mem.Off = e.Off
      mem.On = e.On
      c += 1
    } else if (index === d.length - 1) {
      // last element
      if (sameOff()) {
        if (sameOn()) {
          c += 1
          Programme.push(c + 'x' + mem.On + '/' + mem.Off)
        } else if (!sameOn()) {
          if (mem.Train) {
            // dash train has started
            mem.Dash.push(e.On)
            Programme.push(mem.Dash.join('-') + '/' + mem.Off)
          } else if (c == 1) {
            // no dash train yet (same off, diff on)
            mem.Dash = [mem.On, e.On]
            Programme.push(mem.Dash.join('-') + '/' + mem.Off)
          } else {
            pushSet()
            Programme.push(e.On + '/' + e.Off)
          }
        }
      } else if (!sameOff()) {
        if (mem.Train) {
          // push dash train to Programme
          Programme.push(mem.Dash.join('-') + '/' + mem.Off)
        } else {
          pushSet()
        }
        mem.On = e.On
        mem.Off = e.Off
        Programme.push(mem.On + '/' + mem.Off)
      }
    } else {
      // in-between
      if (sameOff()) {
        if (sameOn()) {
          c += 1
        } else if (!sameOn()) {
          if (mem.Train) {
            // dash train has started
            mem.Dash.push(e.On)
          } else if (c == 1) {
            // no dash train yet (same off, diff on)
            // and set count is 1
            mem.Dash = [mem.On, e.On]
            mem.Train = true
          } else {
            pushSet()
            mem.On = e.On
            c = 1
          }
        }
      } else if (!sameOff()) {
        if (mem.Train) {
          // push dash train to Programme
          const temp_train = mem.Dash.join('-')
          Programme.push(temp_train + '/' + mem.Off)
        } else {
          pushSet()
        }
        mem.On = e.On
        mem.Off = e.Off
        mem.Train = false
        mem.Dash = []
      }
    }
  })
  const output = {}
  output.Programme = Programme.join(', ')
  return output
}

/*
 * Prettify Distance
 */
const prettifyOnOff = (arr) => {
  const isKeyWord = {
    On: 1,
    Off: 1,
  }
  arr.forEach((training) => {
    // training is an object
    const n = {}
    const by_sets = [] // each set being { On: "", Off: "" }
    for (const key in training) {
      const subtype = key.slice(0, -1) // string minus last char
      const order = key.slice(-1) - 1 // last char

      if (isKeyWord[subtype]) {
        if (typeof by_sets[order] === 'undefined') {
          by_sets[order] = {}
        }
        const target = subtype + 's'
        by_sets[order][subtype] = training[key]
      }
    }
    Object.assign(training, getOnOffProgramme(by_sets))
    training.Distance = displayDistance(training.Distance, 'km')
    const process_date = moment(training.Date, 'DD/MM/YYYY').unix()
    training.SortDate = process_date
  })
  arr.sort(recentFirst)
  return arr
}

/*
 * Prettify Timed
 */
const prettifyTimed = (arr) => {
  arr.forEach((training) => {
    training.Pace = displayPace(training.Duration, training.Distance)
    training.Distance = displayDistance(training.Distance, 'km')
    training.Programme = toHHMMSS(training.Duration)
    const process_date = moment(training.Date, 'DD/MM/YYYY').unix()
    training.SortDate = process_date
  })
  arr.sort(recentFirst)
  return arr
}

export { prettifyDistance, prettifyIntervals, prettifyOnOff, prettifyTimed }