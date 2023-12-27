'use strict'

global.PROCESS_RESULT_COMPLETED = 1;
global.PROCESS_RESULT_SLEEP = 2;
global.PROCESS_RESULT_SUSPEND = 3;

// WE SHOULD ONLY EVER HAVE ONE MONITOR PRIORITY TASK
global.PROCESS_PRIORITY_MONITOR             = 1;
global.PROCESS_PRIORITY_FLAGS               = 2;
global.PROCESS_PRIORITY_STATS               = 3;
global.PROCESS_PRIORITY_CLEANUP_EARLY       = 4;
global.PROCESS_PRIORITY_POWER_CREEPS        = 5;
global.PROCESS_PRIORITY_DEFENSE             = 6;
global.PROCESS_PRIORITY_ATTACK              = 7;
global.PROCESS_PRIORITY_CIVILIAN_IMPORTANT  = 8;
global.PROCESS_PRIORITY_DELIVER             = 9;
global.PROCESS_PRIORITY_DEFAULT             = 10;

class Process
{
    constructor (id, name, data, parent)
    {
        this.id = id;
        this.name = name;
        this.data = data;
        this.parent = parent;
        //console.log('Process.constructor - executing');

        this.priority = PROCESS_PRIORITY_DEFAULT;
    }

    refresh()
    {

    }

    start()
    {

    }

    resume()
    {

    }

    end()
    {
        if (this.data.children)
        {
            for (let label in this.data.children)
            {
                if (kernel.scheduler.isProcessIdActive(this.data.children[label]))
                {
                    kernel.scheduler.killProcessById(this.data.children[label]);
                }
            }
        }
    }

    run()
    {
        //console.log('Process.run - ' + this.name + ' - executing');
        this.clean();
    }

    postRun()
    {
        if (this.frequency && this.frequency > 1 && !this.data.sleep)
        {
            this.sleep(this.frequency);
        }
    }

    sleep(tickCount)
    {
        this.data.sleep = tickCount;
    }

    clean()
    {
        if (this.data.children)
        {
            for (let label in this.data.children)
            {
                if (!kernel.scheduler.isProcessIdActive(this.data.children[label]))
                {
                    delete this.data.children[label];
                }
            }
        }
    }

    launchChildProcess (label, name, data = {}, hold = false)
    {
        if (!this.lcl)
            this.lcl = {};

        if (this.lcl[label])
        {
            //console.log('Process.launchChildProcess - ' + this.name + ' attempted to launch ' + label + ' again - ' + JSON.stringify(data));
            return;
        }

        this.lcl[label] = 1;

        if (!this.data.children)
        {
            this.data.children = {};
        }

        if (this.data.children[label])
        {
            return true;
        }

        this.data.children[label] = kernel.scheduler.launchProcess(name, data, this.id, hold);
        if (hold)
        {
            //console.log('Process.launchChildProcess - ' + this.name + ' suspended for child' + name);
            this.data.hold = 1;
        }


        return this.data.children[label];
    }

    endChildProcess (label)
    {
        if (this.data.children && this.data.children[label])
        {
            if (kernel.scheduler.isProcessIdActive(this.data.children[label]))
            {
                kernel.scheduler.killProcessById(this.data.children[label]);
                delete this.data.children[label];
            }
        }
    }

    endChildProcesses ()
    {
        if (this.data.children)
        {
            for (let label in this.data.children)
            {
                if (kernel.scheduler.isProcessIdActive(this.data.children[label]))
                {
                    kernel.scheduler.killProcessById(this.data.children[label]);
                }
            }

            this.data.children = {};
        }
    }

    suicide ()
    {
        return kernel.scheduler.killProcessById(this.id);
    }
}

module.exports = Process
