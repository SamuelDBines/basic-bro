export function mockRes() {
	const res: any = {};
	res.headers = {};
	res.statusCode = 200;
	res.body = undefined;
	res.writeHead = (code: number, header: Object) => {
		res.statusCode = code;
		res.headers = header;
		return res;
	};
	res.end = (body: Object) => {
		res.body = body;
		return res;
	};
	return res;
}
