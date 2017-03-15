export default function test(Promise, describe, aplus) {
    const adapter = {
        deferred() {
            const pending = {};
            pending.promise = new Promise((resolver, reject) => {
                pending.resolve = resolver;
                pending.reject = reject;
            });
            return pending;
        },
        resolved: (...u) => Promise.resolve(...u),
        rejected: (...u) => Promise.reject(...u)
    };

    describe('Promises/A+ Tests', () => {
        aplus.mocha(adapter);
    });
}