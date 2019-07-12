type Partial<T> = {
    [P in keyof T]?: T[P];
};

export type PartialHTTPResponse = Partial<HTTPResponse>;

export interface IHTTPResponse {
    status: number;
    headers: { [key: string]: string };
    isHTTPResponse: boolean;
    body: any;
}

export class HTTPResponse implements IHTTPResponse {
    status: number;
    headers: { [key: string]: string } = {};
    isHTTPResponse: boolean = true;
    body: any;

    constructor(properties: PartialHTTPResponse) {
        Object.assign(this, properties);
    }
}
