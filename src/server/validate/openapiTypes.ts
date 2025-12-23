type ApiExternalDocs = {
	description: string;
	url: string;
};

type ApiInfo = {
	title: string;
	description: string;
	termsOfService: string;
	contact: {
		name: string;
		url: string;
		email: string;
	};
	license: {
		name: string;
		url: string;
	};
	version: string;
};

type ApiTags = {
	name: string;
	description: string;
	externalDocs: ApiExternalDocs;
};
type ApiServer = {
	url: string;
	description: string;
	variables: {
		env: {
			default: string;
			enum: string[];
			description: string;
		};
	};
};

export interface ApiDocs {
	externalDocs: ApiExternalDocs;
	paths: any;
	tags: ApiTags[];
	info: ApiInfo;
	security:
		| {
				api_key: string[];
		  }[]
		| {
				ApiKeyAuth: string[];
		  }[];
}

enum ApiDocType {
	Swagger = 'swagger',
	Openapi = 'openapi',
}

interface OpenapiDocs extends ApiDocs {
	openapi: string;
	externalDocs: any;
	schemes: any;
	servers: ApiServer[];
	components: any;
	security: {
		ApiKeyAuth: string[];
	}[];
}

interface SwaggerDocs extends ApiDocs {
	swagger: string;
	host?: string;
	basePath?: string;

	schemes: string[];
	consumes: string[];
	produces: string[];
	definitions: object;
	securityDefinitions: object;
	security: {
		api_key: string[];
	}[];
}

export const ApiDocTypeHandler = (doc: OpenapiDocs | SwaggerDocs) => {
	if ('swagger' in doc) return 'swagger';
	if ('openapi' in doc) return 'openapi';
	return '';
};
