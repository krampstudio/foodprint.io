import { describe, it } from 'mocha';
import { expect } from 'chai';
import alimentProvider from '../../src/provider/aliment';

describe('aliment provider', () => {

    it('search for tacos', () => {
        let provider = alimentProvider();
        expect(provider.search).to.be.a.function;
        expect(provider.search('tacos')).to.be.an.object;
    });
});
