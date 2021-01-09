const jwt = require('jsonwebtoken');
const { PasswordHash } = require('phpass');
module.exports = class extends think.Controller {
  constructor(ctx) {
    super(ctx);
    this.modelInstance = this.service(`storage/${this.config('storage')}`, 'Users');
  }

  async githubAction() {
    const instance = this.service('auth/github', this);
    const userInfo = await instance.getUserInfo();

    const {github} = userInfo;
    //generator a fake email if github user have no email
    const email = userInfo.email || `${github}@mail.github`;
    const current = this.ctx.state.userInfo;

    if(think.isEmpty(current)) {
      const user = await this.modelInstance.select({email});
      if(think.isEmpty(user)) {
        const count = await this.modelInstance.count();
        const data = {
          ...userInfo,
          password: (new PasswordHash()).hashPassword(Math.random()),
          type: think.isEmpty(count) ? 'administrator' : 'guest'
        };
        await this.modelInstance.add(data);
      } else {
        await this.modelInstance.update({github}, {email});
      }

      const {redirect} = this.get();
      const token = jwt.sign(email, this.config('jwtKey'));
      if(redirect) {
        return this.redirect(redirect + (redirect.includes('?') ? '&' : '?') + 'token=' + token);
      }
    } else {
      await this.modelInstance.update({github}, {objectId: current.objectId});
    }

    return this.success();
  }
};
