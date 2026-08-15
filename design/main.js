// The stand-in must be evaluated before anything under module/ is: two of the files the gallery
// reaches read `foundry` at module scope, and ES modules evaluate in import order.
import './stand-in/foundry.js';

import { mount } from 'svelte';
import App from './App.svelte';

import '../css/tokens.css';
import '../css/mothership.css';
import './shell.css';

mount(App, { target: document.getElementById('app') });
