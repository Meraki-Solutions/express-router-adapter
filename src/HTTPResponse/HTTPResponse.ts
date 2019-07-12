export interface IHTTPResponse {
    status: number;
    headers: { [key: string]: string };
    isHTTPResponse: boolean;
    body: any;
}

export class HTTPResponse implements IHTTPResponse {
    status: number;
    headers: { [key: string]: string };
    isHTTPResponse: boolean = true;
    body: any;

    constructor({ status, headers, body }: {
        status: number,
        headers?: { [key: string]: string },
        body?: any
    }) {
        this.status = status;
        this.headers = headers;
        this.body = body;
    }
}
