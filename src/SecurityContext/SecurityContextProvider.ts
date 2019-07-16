import { ISecurityContextProvider } from './ISecurityContextProvider';
import { ISecurityContext } from './ISecurityContext';

export class SecurityContextProvider implements ISecurityContextProvider {
    async getSecurityContext({ req: any }: any): Promise<ISecurityContext> {
        return {
          toLogSafeString(): string {
            return 'SecurityContext: none';
          }
        };
    }
}
