'use strict'

const constants = require('constants');

class Program_Empire_Diplomacy extends kernel.process
{
    constructor (...args)
    {
        super(...args);

        //console.log('Program_Empire_Diplomacy.constructor - executing');

        this.frequency = 100;
        this.priority = global.PROCESS_PRIORITY_MONITOR;
    }

    refresh()
    {
        super.refresh();

        if (!Memory.diplomacy)
            Memory.diplomacy = {};
        
        //if (!Memory.diplomacy.ratings)
        {
            // Memory.diplomacy.ratings =
            // {
            //     ['CaptainMuscles']  : constants.AGGRESSION_LEVEL_ALLY,

            // }
            Memory.diplomacy.ratings =
            {
                ['CaptainMuscles']  : constants.AGGRESSION_LEVEL_ALLY,

                ['HailHydra']        : constants.AGGRESSION_LEVEL_FRIENDLY,

                // ['AliceBot']        : constants.AGGRESSION_LEVEL_ALLY,
                // ['EmmaBot']         : constants.AGGRESSION_LEVEL_ALLY,
                // ['JackBot']         : constants.AGGRESSION_LEVEL_ALLY,
                // ['MichaelBot']      : constants.AGGRESSION_LEVEL_ALLY,
                
                // ['Saruss']          : constants.AGGRESSION_LEVEL_ALLY,
                // ['Yoner']           : constants.AGGRESSION_LEVEL_ALLY,
                // ['RayderBlitz']     : constants.AGGRESSION_LEVEL_FRIENDLY,
                // ['Mirroar']         : constants.AGGRESSION_LEVEL_ALLY,

                //['asdpof']          : constants.AGGRESSION_LEVEL_ENEMY,
                //['Silten']          : constants.AGGRESSION_LEVEL_ENEMY,

                //['Robalian']        : constants.AGGRESSION_LEVEL_ENEMY,
                
            }
        }

        this.memory = Memory.diplomacy;
    }

    run()
    {
        super.run();
    }


}

module.exports = Program_Empire_Diplomacy
