import * as Benchmark from 'benchmark'
import * as readonlyArray from '../../src/ReadonlyArray'

const suite = new Benchmark.Suite()

const input = [1, 2, 3, 4, 5, 6, 7, 8, 9]

suite
  .add('reduce (production)', function () {
    readonlyArray.reduce(0, (b, a: number) => b + a)(input)
  })
  .add('reduce (native)', function () {
    input.reduce((b, a) => b + a, 0)
  })
  .on('cycle', function (event: any) {
    console.log(String(event.target))
  })
  .on('complete', function (this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run({ async: true })
