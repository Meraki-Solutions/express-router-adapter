import { IHTTPResponse, PartialHTTPResponse } from './HTTPResponse';

type PartialHTTPError = PartialHTTPResponse & {
  message: string;
};

export class HTTPError extends Error implements IHTTPResponse {
    status: number;
    headers: { [key: string]: string } = {};
    isHTTPResponse: boolean = true;
    body: any;

    constructor({ message, ...rest }: PartialHTTPError) {
        super(message);
        Object.assign(this, rest);
    }

}
