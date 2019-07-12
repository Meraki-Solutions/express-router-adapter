import { IHTTPResponse } from './HTTPResponse';

type PartialHTTPError = IHTTPResponse & {
  message: string;
};

export class HTTPError extends Error implements IHTTPResponse {
    status: number;
    headers: { [key: string]: string } = {};
    isHTTPResponse: boolean = true;
    body: any;

    constructor({ message, status, headers, body }: {
        message: string,
        status: number,
        headers?: { [key: string]: string },
        body?: any
    }) {
        super(message);
        this.status = status;
        this.headers = headers;
        this.body = body;
    }

}
