# @mobey/shared

## Clamp usage

`clamp(value, min, max)` takes three numeric arguments and returns a number.
An in-range value is returned unchanged; a value below `min` returns `min`, and
a value above `max` returns `max`. If `min > max`, it throws a native `RangeError`.

```typescript
import { clamp } from '@mobey/shared';

clamp(11, 0, 10); // 10
```
