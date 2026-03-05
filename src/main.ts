import './styles.css';
import { initApp } from './app/ui';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Missing #app root node');
}

initApp(root);
