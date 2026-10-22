# @mobey/shared

## Median usage

`median(values: number[]): number` accepts an array of numbers and returns its
median in numeric order. For an odd-length array, it returns the middle value; for
an even-length array, it returns the arithmetic mean of the two middle values.
It sorts a copy, preserving the supplied array. An empty array throws `RangeError`.

```ts
import { median } from '@mobey/shared';

median([3, 1, 2]); // 2
```
