const mongoose = require('mongoose');

const Autotask = mongoose.model(
    'Autotask',
    new mongoose.Schema({
      // set a model to auto call a function at intevals or at a specific time
        name: String,
        description: String,
        // cron job
        cron: String,
        // function to call
        function: {type: String, required: true},
        // arguments to pass to the function
        arguments: [String],
        // active
        active: Boolean,
        // last run
        lastRun: Date,
        // next run
        nextRun: Date,
        // last result
        lastResult: String,
        // last error
        lastError: String,
        recursive: Boolean,
        activeOnStart: Boolean,
        errorRecursive: Boolean,
        errorCount: Number,
        errorLimit: Number
    }).pre('save', function (next) {
        // if errorCount is greater or egual than errorLimit, stop the task and send an email
        if (this.errorCount >= this.errorLimit) {
            this.active = false;
            // send an email
        }
    
        
        next();
      })
);

  

module.exports = Autotask;
