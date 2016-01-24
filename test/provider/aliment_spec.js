
import { expect } from 'chai';
import alimentProvider from '../../src/provider/aliment';

describe('aliment provider', () => {

    it('is a factory', () => {
        expect(alimentProvider).to.be.a.function;
    });
});
