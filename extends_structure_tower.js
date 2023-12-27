'use strict'

StructureTower.prototype.estimatedEffectivenessAtPosition = function(position)
{
    if (position.roomName != this.pos.roomName)
        return 0;

    let rangeToTarget = Math.clamp(this.pos.getRangeTo(position), TOWER_OPTIMAL_RANGE, TOWER_FALLOFF_RANGE) - TOWER_OPTIMAL_RANGE;
    let rangePercent = rangeToTarget / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);

    let effectiveness = 1 - (TOWER_FALLOFF * rangePercent);
    return effectiveness;
}

StructureTower.prototype.estimatedDamageAtPosition = function(position)
{
    return this.estimatedEffectivenessAtPosition(position) * TOWER_POWER_ATTACK;
}

StructureTower.prototype.estimatedHealingAtPosition = function(position)
{
    return this.estimatedEffectivenessAtPosition(position) * TOWER_POWER_HEAL;
}

StructureTower.prototype.estimatedRepairAtPosition = function(position)
{
    return this.estimatedEffectivenessAtPosition(position) * TOWER_POWER_REPAIR;
}
