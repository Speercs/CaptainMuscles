'use strict'

Math.clamp = function(value, min, max)
{
    return Math.min(Math.max(value, min), max);
}

Math.lerp = function(from, to, amount)
{
    return ((1 - amount) * from) + (amount * to);
}
