export type Child =
	| Node
	| string
	| number
	| boolean
	| null
	| undefined
	| Child[];

export type Component<P = {}> = (props: P & { children?: Child }) => Node;

export type Subscriber<T> = (value: T) => void;

export interface State<T> {
	get(): T;
	set(value: T): void;
	subscribe(cb: Subscriber<T>): () => void; // returns unsubscribe
}

export function h<P>(
	type: string | Component<P>,
	props: P | null,
	...children: Child[]
): Node {
	props = (props || {}) as P;

	if (typeof type === 'function') {
		return type({ ...(props as any), children });
	}

	const el = document.createElement(type);

	for (const [key, value] of Object.entries(props as any)) {
		if (key === 'className') {
			el.className = String(value);
		} else if (key === 'style' && value && typeof value === 'object') {
			Object.assign(el.style, value);
		} else if (key.startsWith('on') && typeof value === 'function') {
			// onClick -> "click"
			el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
		} else {
			el.setAttribute(key, String(value));
		}
	}

	const flatChildren = (children as Child[]).flat(Infinity) as Child[];

	for (let child of flatChildren) {
		if (child == null || child === false) continue;

		if (typeof child === 'string' || typeof child === 'number') {
			child = document.createTextNode(String(child));
		}

		if (child instanceof Node) {
			el.appendChild(child);
		}
	}

	return el;
}

export function Fragment(props: { children?: Child }): Node | DocumentFragment {
	const { children } = props;

	if (children instanceof Node) return children;

	if (Array.isArray(children)) {
		const frag = document.createDocumentFragment();
		for (const c of children) {
			if (c == null || c === false) continue;
			if (typeof c === 'string' || typeof c === 'number') {
				frag.append(String(c));
			} else if (c instanceof Node) {
				frag.appendChild(c);
			}
		}
		return frag;
	}

	if (
		typeof children === 'string' ||
		typeof children === 'number' ||
		typeof children === 'boolean'
	) {
		return document.createTextNode(String(children));
	}

	return document.createDocumentFragment();
}

export function state<T>(initial: T): State<T> {
	let value = initial;
	const subs = new Set<Subscriber<T>>();

	return {
		get() {
			return value;
		},
		set(next: T) {
			if (Object.is(next, value)) return;
			value = next;
			for (const cb of subs) cb(value);
		},
		subscribe(cb: Subscriber<T>) {
			subs.add(cb);
			cb(value);
			return () => subs.delete(cb);
		},
	};
}

export function textSignal<T>(s: State<T>): Text {
	const node = document.createTextNode(String(s.get()));
	s.subscribe((v) => {
		node.textContent = String(v);
	});
	return node;
}

declare global {
	namespace JSX {
		type Element = Node;

		interface ElementChildrenAttribute {
			children: {};
		}

		interface IntrinsicElements {
			[key: string]: any;
		}
	}
}

interface ApiOptions {
	endpoint: string;
}

type APIMethods = 'GET' | 'POST'| "PUT" | "PATCH" | "DELETE"

export const api = (opts: ApiOptions) => {
	const createUrl = (uri: string) => opts.endpoint + uri;
	
	const req = async (method: APIMethods, uri: string, body?: Record<string, any>, headers?: Record<string, string>) => {
		const url = createUrl(uri);
		const res = await fetch(url, {
			method,
			body: body && JSON.stringify(body),
			headers: {
				'Content-Type': 'application/json',
				...headers,
			}
		})
		try {
			return {
				data: res.json(),
				status: res.status,
			}
		} catch(err) {
			return {
				err,
				status: res.status,
			}
		}
	}
	return {
		get: (uri: string, headers?: Record<string, string>) => req('GET', uri, undefined, headers),
		post: (uri: string, body?: Record<string, any>, headers?: Record<string, string>) => req('POST', uri, body, headers),
		put: (uri: string, body?: Record<string, any>, headers?: Record<string, string>) => req('PUT', uri, body, headers),
		patch: (uri: string, body?: Record<string, any>, headers?: Record<string, string>) => req('PATCH', uri, body, headers),
		del: (uri: string, headers?: Record<string, string>) => req('POST', uri, headers)
	}

}

// export function h(type: any, props: any, ...children: any) {
// 	props = props || {};

// 	if (typeof type === 'function') {
// 		return type({ ...props, children });
// 	}

// 	const el = document.createElement(type);

// 	for (const [key, value] of Object.entries(props)) {
// 		if (key === 'className') {
// 			el.className = value;
// 		} else if (key === 'style' && typeof value === 'object') {
// 			Object.assign(el.style, value);
// 		} else if (key.startsWith('on') && typeof value === 'function') {
// 			el.addEventListener(key.slice(2).toLowerCase(), value);
// 		} else {
// 			el.setAttribute(key, value);
// 		}
// 	}

// 	const flatChildren = children.flat(Infinity);
// 	for (let child of flatChildren) {
// 		if (child == null || child === false) continue;
// 		if (typeof child === 'string' || typeof child === 'number') {
// 			child = document.createTextNode(String(child));
// 		}
// 		el.appendChild(child);
// 	}

// 	return el;
// }

// export function Fragment({ children }: any) {
// 	return children;
// }
