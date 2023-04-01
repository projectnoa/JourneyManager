import { OAuth2Strategy } from 'passport-oauth';

class Strategy extends OAuth2Strategy {
  constructor(options, verify) {
    options = options || {};
    options.authorizationURL = options.authorizationURL || process.env.JM_WP_ENDPOINT + '/oauth/authorize/';
    options.tokenURL = options.tokenURL || process.env.JM_WP_ENDPOINT + '/oauth/token';
    const profileUrl = options.profileUrl || process.env.JM_WP_ENDPOINT + '/wp-json/wp/v2/users/me';
    options.clientID = options.clientID || process.env.JM_WP_AUTH_ID;

    super(options, verify);
    this.name = 'wordpress';
    this.profileUrl = profileUrl;
  }

  userProfile(accessToken, done) {
    this._oauth2.useAuthorizationHeaderforGET(true);

    this._oauth2.get(this.profileUrl, accessToken, function (err, body, res) {
      if (err) { return done(err); }

      try {
        const json = JSON.parse(body);

        let profile = { provider: 'Wordpress' };
        profile.id = json.ID || json.id;
        profile.displayName = json.name;

        profile._raw = body;
        profile._json = json;
        done(null, profile);
      } catch (e) {
        done(e);
      }
    });
  }
}

export default Strategy;