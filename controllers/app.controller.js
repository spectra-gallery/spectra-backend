const db = require("../models");
const mail = require("../middlewares/mail");
require("dotenv").config();

const cron = require("node-cron");

const scheduleConfig = require("../config/schedule.config");
const keyManager = require("../middlewares/keyManager");

const app = require("../config/app.config");
const dataViz = require("../config/dataviz.config");
const { id } = require("ethers/lib/utils");

const App = db.app;
const AutoTask = db.autotask;
const Word = db.word;
const Post = db.post;
const Serie = db.serie;
const Theme = db.theme;
const User = db.user;
const Palette = db.palette;

// initialize the app
const initializeApp = async () => {
    try {
        const appData = await App.findOne({});
        if (!appData) {
            const app = new App({
                status: "active",
            });

            await app.save();


            return app;
        }

        return appData;

    } catch (err) {
        return err;
    }
};

initializeApp()
    .then((app) => {
        console.log(app);
    })
    .catch((err) => {
        console.log(err);
    });

exports.getThemes = async (req, res) => {
    const themes = await Theme.find({ public: true })

    if (!themes) {
        res.status(404).send({
            message: "Themes not found",
        });
        return;
    }

    const themeData = [];

    for (const theme of themes) {
        themeData.push({
            id: theme._id,
            name: theme.name,
            description: theme.description,
            mode: theme.mode,
            author: theme.author,
            personalize: theme.personalize
        });
    }

    res.status(200).send({
        themes: themeData,
    });
};

// change the app theme
exports.changeTheme = async (req, res) => {
    const app = await App.findOne({});

    if (!app) {
        res.status(404).send({
            message: "Settings not allowed",
        });
        return;
    }

    app.theme = req.params.theme;

    await app.save();

    res.status(200).send({
        theme: app.theme,
        message: "Theme changed",
    });

};


// get the app theme
exports.getDesignById = async (req, res) => {
    const id = req.params.id;

    const theme = await Theme.findById(id)
        .populate("palette", "-__v")

    if (!theme) {
        res.status(404).send({
            message: "Theme not found",
        });
        return;
    }

    res.status(200).send({
        theme,
    });
}


exports.getDesignByMode = async (req, res) => {
    const mode = req.params.mode;

    // get by mode but if public is false
    const theme = await Theme.findOne({ mode, public: true })
        .populate("palette", "-__v")

    if (!theme) {
        res.status(404).send({
            message: "Theme not found",
        });
        return;
    }

    res.status(200).send({
        theme,
    });
}

exports.createTheme = async (req, res) => {

    const userId = req.userId;

    const name = req.body.name;
    const description = req.body.description;
    const mode = req.body.mode;

    const author = userId;

    const public = req.body.public;
    const personalize = req.body.personalize;

    const selectedPalette = req.body.palette;
    
      const newPalette = {
          $inkwell: selectedPalette.inkwell,
          $darknight: selectedPalette.darknight,
          $darkblue: selectedPalette.darkblue,
          $darkpurple: selectedPalette.darkpurple,
          $deepblue: selectedPalette.deepblue,
          $blue: selectedPalette.blue,
          $lightgreen: selectedPalette.lightgreen,
          $paleturquoise: selectedPalette.paleturquoise,
          $fluogreen: selectedPalette.fluogreen,
          $palegreen: selectedPalette.palegreen,
          $yellowish: selectedPalette.yellowish,
          $indigo: selectedPalette.indigo,
          $greyblue: selectedPalette.greyblue,
          $bluesky: selectedPalette.bluesky,
          $salmon: selectedPalette.salmon,
          $redpink: selectedPalette.redpink,
          $whitebeach: selectedPalette.whitebeach,
          $palewhitebeach: selectedPalette.palewhitebeach,
          $darkwhitebeach: selectedPalette.darkwhitebeach,
          $bitcoin: selectedPalette.bitcoin,
          $lightolive: selectedPalette.lightolive,
          $olive: selectedPalette.olive
      };
    
      const paletteIds = [];
    
      // for each colors generate a new palette
      for (const key in newPalette) {
          const color = newPalette[key];
    
          const newColor = new Palette({
              name: key,
              hex: color
          });
    
          await newColor.save();
    
          paletteIds.push(newColor._id);
    
      }

    const theme = new Theme({
        name,
        description,
        mode,
        author,
        public,
        personalize,
        palette: paletteIds
    });

    await theme.save();

    res.status(200).send({
        id: theme._id,
        name: theme.name,
        message: "Theme created",
    });

};


const setFrequentWords = async () => {
  try {
    Word.deleteMany({}, () => {
      console.log("Words deleted");
    });

    const words = [];

    const posts = await Post.find({})
      .populate("section", "content")
      .populate("comment");

    for (const post of posts) {
      for (const section of post.section) {
        const content = section.content.split(" ");

        for (const word of content) {
          words.push(word);
        }
      }

      for (const comment of post.comment) {
        const content = comment.content.split(" ");

        for (const word of content) {
          words.push(word);
        }
      }

      const content = post.description.split(" ");

      for (const word of content) {
        words.push(word);
      }
    }

    const series = await Serie.find({});

    for (const serie of series) {
      const content = serie.description.split(" ");

      for (const word of content) {
        words.push(word);
      }
    }

    const wordCount = {};

    for (const word of words) {
      if (wordCount[word]) {
        wordCount[word] += 1;
      } else {
        wordCount[word] = 1;
      }
    }

    const sortable = [];

    const worldIds = [];

    for (const word in wordCount) {
      const stopwords = [
        "the",
        "and",
        "to",
        "of",
        "a",
        "in",
        "for",
        "is",
        "on",
        "with",
        "that",
        "by",
        "this",
        "are",
        "it",
        "as",
        "from",
        "at",
        "or",
        "an",
        "be",
        "you",
        "your",
        "our",
        "we",
        "us",
        "i",
        "my",
        "me",
        "he",
        "she",
        "him",
        "her",
        "they",
        "them",
        "their",
        "his",
        "its",
        "who",
        "whom",
        "whose",
        "which",
        "what",
        "where",
        "when",
        "why",
        "how",
        "if",
        "else",
        "then",
        "than",
        "though",
        "although",
        "because",
        "since",
        "while",
        "before",
        "after",
        "during",
        "until",
        "unless",
        "nor",
        "not",
        "only",
        "either",
        "neither",
        "both",
        "each",
        "every",
        "all",
        "any",
        "some",
        "such",
        "no",
        "nor",
        "too",
        "enough",
        "so",
        "that",
        "such",
        "enough",
        "quite",
        "very",
        "as",
        "less",
        "more",
        "many",
        "few",
        "most",
        "least",
        "only",
        "own",
        "other",
        "another",
        "next",
        "last",
        "first",
        "second",
        "third",
        "fourth",
        "fifth",
        "sixth",
        "seventh",
        "eighth",
        "ninth",
        "tenth",
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "ten",
        "about",
        "against",
        "between",
        "into",
        "through",
        "toward",
        "under",
        "above",
        "below",
        "upon",
        "along",
        "behind",
        "across",
        "around",
        "before",
        "beneath",
        "beside",
        "between",
        "beyond",
        "inside",
        "outside",
        "underneath",
      ];
      // if the world is a stop word, skip it
      if (stopwords.includes(word) || word.length < 5 || wordCount[word] < 5) {
        continue;
      }

      sortable.push([word, wordCount[word]]);

      const worldData = new Word({
        name: word,
        frequency: wordCount[word],
      });

      await worldData.save();

      worldIds.push(worldData._id);

      artist.frequentWords = worldIds;

      await artist.save();
    }

    console.log("Frequent words set");
  } catch (err) {
    console.log(err);
  }
};

exports.setFrequentWords = setFrequentWords;

setFrequentWords();

// populate the database with the default tasks from the config
async function populateDatabase() {
  let status = [];
  try {
    for (const task of scheduleConfig) {
      // check if the task already exists
      const existingTask = await AutoTask.findOne({ name: task.name });

      if (existingTask) {
        status.push({
          name: task.name,
          message: "Task already exists",
        });
        continue;
      }

      const newTask = new AutoTask({
        name: task.name,
        description: task.description,
        cron: task.cron,
        function: task.function,
        arguments: task.arguments,
        active: task.active,
        lastRun: new Date(),
        nextRun: new Date(),
        lastResult: "Task not yet run",
        lastError: "No errors",
        recursive: task.recursive,
        activeOnStart: task.activeOnStart,
        errorRecursive: task.errorRecursive,
        errorCount: task.errorCount,
        errorLimit: task.errorLimit,
      });

      await newTask.save();

      status.push({
        name: task.name,
        message: "Task added",
      });
    }

    return status;
  } catch (err) {
    return err;
  }
}

populateDatabase()
  .then((status) => {
    console.log(status);
  })
  .catch((err) => {
    console.log(err);
  });

// run tasks set to active on start
async function runActiveOnStartTasks() {
  const tasks = await AutoTask.find({ activeOnStart: true });

  for (const task of tasks) {
    runTask(task);
  }
}

runActiveOnStartTasks();

// check for tasks that should be running
async function checkTasks() {
  const tasks = await AutoTask.find();

  const status = [];

  for (const task of tasks) {
    if (task.active) {
      if (task.recursive) {
        if (task.nextRun <= new Date()) {
          const result = await runTask(task);

          status.push({
            id: task._id,
            result,
          });
        } else {
          status.push({
            id: task._id,
            message: "Task not yet due",
          });
        }
      }
    }
  }

  return status;
}

// check tasks every minute
cron.schedule("* * * * *", async () => {
  await checkTasks();
});

// request to check tasks
exports.checkTasks = async (req, res) => {
  const status = await checkTasks();

  res.status(200).send({
    status,
  });
};

// get all tasks
exports.getAllTasks = async (req, res) => {
  const tasks = await AutoTask.find();

  res.status(200).send(tasks);
};

// get a task
exports.getTask = async (req, res) => {
  const task = await AutoTask.findById(req.params.id);

  if (!task) {
    res.status(404).send({
      message: "Task not found",
    });
    return;
  }

  res.status(200).send(task);
};

// update a task
exports.updateTask = async (req, res) => {
  const task = await AutoTask.findById(req.params.id);

  if (!task) {
    res.status(404).send({
      message: "Task not found",
    });
    return;
  }

  task.name = req.body.name;
  task.description = req.body.description;
  task.cron = req.body.cron;
  task.function = req.body.function;
  task.arguments = req.body.arguments;
  task.active = req.body.active;
  task.recursive = req.body.recursive;
  task.activeOnStart = req.body.activeOnStart;
  task.errorRecursive = req.body.errorRecursive;
  task.errorCount = req.body.errorCount;
  task.errorLimit = req.body.errorLimit;

  await task.save();

  res.status(200).send({
    id: task._id,
    message: "Task updated",
  });
};

// delete a task
exports.deleteTask = async (req, res) => {
  await AutoTask.findByIdAndDelete(req.params.id);

  res.status(200).send({
    message: "Task deleted",
  });
};

// run a task
exports.runTask = async (req, res) => {
  const task = await AutoTask.findById(req.params.id);

  if (!task) {
    res.status(404).send({
      message: "Task not found",
    });
    return;
  }

  // run the task
  const result = await runTask(task);

  res.status(200).send({
    result,
  });
};

// run all tasks
exports.runAllTasks = async (req, res) => {
  const tasks = await AutoTask.find();

  for (const task of tasks) {
    await runTask(task);
  }

  res.status(200).send({
    message: "All tasks run",
  });
};

// run a task
/*
async function runTask(task) {
  let result = "Task run successfully";
  let error = "No errors";

  try {
    // run the function
    await task.function(...task.arguments);

    // update the task
    task.lastRun = new Date();
    task.lastResult = result;
    task.lastError = error;

    // if the task is recursive, calculate the next run time
    if (task.recursive) {
      task.nextRun = new Date(task.nextRun.getTime() + task.cron);
    }

    await task.save();

    return result;
  } catch (err) {
    error = err.message;

    // update the task
    task.lastRun = new Date();

    task.lastResult = result;
    task.lastError = error;

    await task.save();

    return error;
  }
} */

async function runTask(task) {
  let result = "Task run successfully";
  let error = "No errors";

  try {
    // run the function
    await task.function(...task.arguments);

    // update the task
    task.lastRun = new Date();
    task.lastResult = result;
    task.lastError = error;

    // if the task is recursive, calculate the next run time
    if (task.recursive) {
      task.nextRun = new Date(task.nextRun.getTime() + task.cron);
    }

    await task.save();

    return result;
  } catch (err) {
    error = err.message;

    // update the task
    task.lastRun = new Date();

    task.lastResult = result;
    task.lastError = error;

    // if the task is recursive, calculate the next run time
    if (task.errorRecursive) {
      task.nextRun = new Date(task.nextRun.getTime() + task.cron);
    }

    // if the task has an error limit, check if the error limit has been reached
    if (task.errorCount >= task.errorLimit) {
      // send an email
      await mail.sendMail(
        process.env.EMAIL,
        "Error Limit Reached",
        `The task ${task.name} has reached the error limit of ${task.errorLimit}.`
      );

      // stop the task
      task.active = false;
    }

    await task.save();

    return error;
  }
}

// start all tasks
exports.startAllTasks = async (req, res) => {
  const tasks = await AutoTask.find();

  for (const task of tasks) {
    startTask(task);
  }

  res.status(200).send({
    message: "All tasks started",
  });
};

// start a task
exports.startTask = async (req, res) => {
  const task = await AutoTask.findById(req.params.id);

  if (!task) {
    res.status(404).send({
      message: "Task not found",
    });
    return;
  }

  startTask(task);

  res.status(200).send({
    message: "Task started",
  });
};

// start a task
function startTask(task) {
  cron.schedule(task.cron, async () => {
    runTask(task);
  });
}

// stop all tasks
exports.stopAllTasks = async (req, res) => {
  const tasks = await AutoTask.find();

  for (const task of tasks) {
    stopTask(task);
  }

  res.status(200).send({
    message: "All tasks stopped",
  });
};

// stop a task
exports.stopTask = async (req, res) => {
  const task = await AutoTask.findById(req.params.id);

  if (!task) {
    res.status(404).send({
      message: "Task not found",
    });
    return;
  }

  stopTask(task);

  res.status(200).send({
    message: "Task stopped",
  });
};

// stop a task
function stopTask(task) {
  task.stop();
}

// pause all tasks
exports.pauseAllTasks = async (req, res) => {
  const tasks = await AutoTask.find();

  for (const task of tasks) {
    pauseTask(task);
  }

  res.status(200).send({
    message: "All tasks paused",
  });
};

// pause a task
exports.pauseTask = async (req, res) => {
  const task = await AutoTask.findById(req.params.id);

  if (!task) {
    res.status(404).send({
      message: "Task not found",
    });
    return;
  }

  pauseTask(task);

  res.status(200).send({
    message: "Task paused",
  });
};

// pause a task
function pauseTask(task) {
  task.pause();
}

// resume all tasks
exports.resumeAllTasks = async (req, res) => {
  const tasks = await AutoTask.find();

  for (const task of tasks) {
    resumeTask(task);
  }

  res.status(200).send({
    message: "All tasks resumed",
  });
};

// resume a task
exports.resumeTask = async (req, res) => {
  const task = await AutoTask.findById(req.params.id);

  if (!task) {
    res.status(404).send({
      message: "Task not found",
    });
    return;
  }

  resumeTask(task);

  res.status(200).send({
    message: "Task resumed",
  });
};

// resume a task
function resumeTask(task) {
  task.resume();
}

// program a task
exports.programTask = async (req, res) => {
  const task = new AutoTask({
    name: req.body.name,
    description: req.body.description,
    cron: req.body.cron,
    function: req.body.function,
    arguments: req.body.arguments,
    active: req.body.active,
    lastRun: new Date(),
    nextRun: new Date(),
    lastResult: "Task not yet run",
    lastError: "No errors",
    recursive: req.body.recursive,
    activeOnStart: req.body.activeOnStart,
    errorRecursive: req.body.errorRecursive,
    errorCount: req.body.errorCount,
    errorLimit: req.body.errorLimit,
  });

  await task.save();

  res.status(200).send({
    id: task._id,
  });
};

/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param {number} ms - The number of milliseconds to delay.
 * @return {Promise<void>} A promise that resolves after the specified delay.
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
