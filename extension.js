// The module 'vscode' contains the VS Code extensibility API
const vscode = require('vscode');

let statusBar;

const commandId = 'countdown-timer.activate';
const setTimerCommandId = 'countdown-timer.settimer';
const hideStatusBarOnIdleCommandId = 'countdown-timer.hidestatusonidle';
const showStatusBarOnIdleCommandId = 'countdown-timer.showstatusonidle';
const startPomodoroTimerCommandId = 'countdown-timer.startpomodoro';
const stopPomodoroTimerCommandId = 'countdown-timer.stoppomodoro';
const updatePomodoroWorkTimeCommandId =
  'countdown-timer.update_pomodoro_work_time';
const updatePomodoroBreakTimeCommandId =
  'countdown-timer.update_pomodoro_break_time';

let pomodoroTimerIntervalId = null;
let timerIntervalId = null;

let isBreak = false;

let WorkTime = 1500; // 25 min
let BreakTime = 300; // 5 min

let timeLeft = 0;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  context.subscriptions.push(disposable);
  context.subscriptions.push(setTimerRegisterCommand);
  context.subscriptions.push(hideStatusBarItemOnIdleCommand);
  context.subscriptions.push(showStatusBarItemOnIdleCommand);
  context.subscriptions.push(startPomodoroTimerCommand);
  context.subscriptions.push(stopPomodoroTimerCommand);
  context.subscriptions.push(updatePomodoroWorkTimeCommand);
  context.subscriptions.push(updatePomodoroBreakTimeCommand);

  createStatusBar();

  context.subscriptions.push(statusBar);
}

function deactivate() {
  clearInterval(timerIntervalId);
  clearInterval(pomodoroTimerIntervalId);
}

let disposable = vscode.commands.registerCommand(commandId, function () {
  vscode.window.showInformationMessage(
    'Count Down Timer extension is active now!'
  );
});

const setTimerRegisterCommand = vscode.commands.registerCommand(
  setTimerCommandId,
  async function () {
    const userInput = await getUserInput(
      'HH:MM:SS format. Example: 01:30:00',
      validateTime
    );

    if (!userInput) {
      return;
    }

    vscode.window.showInformationMessage(
      `Countdown timer is set for ${userInput} ⬇️`
    );

    manageTimer(userInput);
  }
);

const hideStatusBarItemOnIdleCommand = vscode.commands.registerCommand(
  hideStatusBarOnIdleCommandId,
  function () {
    statusBar.hide();
  }
);

const showStatusBarItemOnIdleCommand = vscode.commands.registerCommand(
  showStatusBarOnIdleCommandId,
  function () {
    statusBar.show();
  }
);

const startPomodoroTimerCommand = vscode.commands.registerCommand(
  startPomodoroTimerCommandId,
  function () {
    clearInterval(pomodoroTimerIntervalId);
    pomodoroTimer();
  }
);

const stopPomodoroTimerCommand = vscode.commands.registerCommand(
  stopPomodoroTimerCommandId,
  function () {
    clearInterval(pomodoroTimerIntervalId);
    isBreak = false;
    updateStatusBar('Not Set');
  }
);

const updatePomodoroWorkTimeCommand = vscode.commands.registerCommand(
  updatePomodoroWorkTimeCommandId,
  async function () {
    const userInput = await getUserInput(
      'HH:MM:SS format. Example: 00:25:00',
      validateTime
    );

    if (!userInput) {
      return;
    }

    WorkTime = getTimeInSeconds(userInput);

    vscode.window.showInformationMessage(
      `Pomodoro work time updated to ${userInput}`
    );

    restartPomodoroTimer();
  }
);

const updatePomodoroBreakTimeCommand = vscode.commands.registerCommand(
  updatePomodoroBreakTimeCommandId,
  async function () {
    const userInput = await getUserInput(
      'HH:MM:SS format. Example: 00:05:00',
      validateTime
    );

    if (!userInput) {
      return;
    }

    BreakTime = getTimeInSeconds(userInput);

    vscode.window.showInformationMessage(
      `Pomodoro break time updated to ${userInput}`
    );

    restartPomodoroTimer();
  }
);

function createStatusBar() {
  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right
  );

  updateStatusBar('Not Set');
  statusBar.command = setTimerCommandId;
  statusBar.show();
}

function updateStatusBar(text) {
  statusBar.text = `$(watch) ${text}`;
}

const validateTime = (inputTime) => {
  const pattern = /^(\d{2}):(\d{2}):(\d{2})$/;

  if (!pattern.test(inputTime)) {
    return 'Invalid format!! Please enter time in HH:MM:SS format';
  }

  const [hh, mm, ss] = inputTime.split(':').map(Number);

  if (ss > 59) {
    return 'Seconds are more than 59!! Add Minutes instead';
  }

  if (mm > 59) {
    return 'Minutes are more than 59!! Add Hours instead';
  }

  if (hh > 24) {
    return 'Hours are more than 24!! More than a day is not supported yet.';
  }

  if (hh === 24 && (mm > 0 || ss > 0)) {
    return 'Hours are more than 24!! More than a day is not supported yet.';
  }

  if (hh === 0 && mm === 0 && ss === 0) {
    return 'OMG!! All zeros. It is already expired';
  }

  return null;
};

async function getUserInput(placeHolderText, validateInputFunction) {
  return vscode.window.showInputBox({
    placeHolder: placeHolderText,
    validateInput: (text) => validateInputFunction(text),
  });
}

function manageTimer(targetTime) {
  clearInterval(timerIntervalId);

  const wasVisible = statusBar._visible;

  if (!wasVisible) {
    statusBar.show();
  }

  timeLeft = getTimeInSeconds(targetTime);

  updateStatusBar(getCurrentTimeLeft());

  timerIntervalId = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerIntervalId);

      updateStatusBar('Not Set');

      vscode.window.showInformationMessage(
        'Countdown Timer: Expired 🎉🎉 Congratulations 🎉🎉'
      );

      if (!wasVisible) {
        statusBar.hide();
      }

      return;
    }

    timeLeft--;
    updateStatusBar(getCurrentTimeLeft());
  }, 1000);
}

const getCurrentTimeLeft = () => {
  const hh = Math.floor(timeLeft / 3600);
  const mm = Math.floor((timeLeft % 3600) / 60);
  const ss = timeLeft % 60;

  return `${hh}h ${mm}m ${ss}s`;
};

const getTimeInSeconds = (targetTime) => {
  const [hh, mm, ss] = targetTime.split(':').map(Number);

  return hh * 3600 + mm * 60 + ss;
};

const pomodoroTimer = () => {
  clearInterval(pomodoroTimerIntervalId);

  isBreak = false;
  timeLeft = WorkTime;

  updateStatusBar(getCurrentTimeLeft());

  pomodoroTimerIntervalId = setInterval(() => {
    if (timeLeft <= 0) {
      isBreak = !isBreak;

      if (isBreak) {
        timeLeft = BreakTime;

        vscode.window.showInformationMessage(
          'Countdown Timer: Have a break'
        );
      } else {
        timeLeft = WorkTime;

        vscode.window.showInformationMessage(
          'Countdown Timer: Focusing in work'
        );
      }
    }

    updateStatusBar(getCurrentTimeLeft());
    timeLeft--;
  }, 1000);
};

const restartPomodoroTimer = () => {
  clearInterval(pomodoroTimerIntervalId);

  updateStatusBar('Restarting $(debug-restart)');

  pomodoroTimer();
};

module.exports = {
  activate,
  deactivate,
  validateTime,
};
