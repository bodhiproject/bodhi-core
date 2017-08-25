const Topic = artifacts.require('Topic')

contract('Topic', function(accounts) {
  it("should assert true", function(done) {
    var topic = Topic.deployed();
    assert.isTrue(true);
    done();
  });
});
