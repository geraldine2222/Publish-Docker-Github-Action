"use strict";
const { setOutput, setFailed } = require('@actions/core');
const { execSync } = require('child_process');
const { release } = require('release');
release(execSync, setOutput, setFailed);
