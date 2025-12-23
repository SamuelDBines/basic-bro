import { h, Component } from './runtime';

export const ClientRender = (element: string = 'app', root: Node) => {
	const body = document.getElementsByName('body'),
		main = document.getElementsByName('main'),
		app = document.getElementById(element);
	if (app) {
		app.append(root);
	} else {
		throw 'Node does not exist';
	}
};

// app.innerHTML = Button();
app?.appendChild(Button());
