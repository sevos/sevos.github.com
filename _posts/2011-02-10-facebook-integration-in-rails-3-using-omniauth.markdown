---
layout: post
title:
---

> **Warning**:
> This blog post was originaly written in February 2011.
> Since that time OmniAuth 1.x has been released and it's API
> has been changed. Please refer to [OmniAuth wiki](https://github.com/intridea/omniauth/wiki/Upgrading-to-1.0)
> for further details

# Facebook integration in Rails 3 using OmniAuth 

Recently I faced a task of integrating Facebook and Twitter into my application. I wanted to let users sign up and sign in by their social network accounts. My application does not require any special information to create an account - just an email address. I dug a bit and found that the best fit for me was [OmniAuth](https://github.com/intridea/omniauth). I also found great [railscast](http://railscasts.com/episodes/235-omniauth-part-1) (and [part two](http://railscasts.com/episodes/236-omniauth-part-2)) made by Ryan Bates. My solution is based mostly on these two screencasts.

The code shown by Ryan was just a hint, how it should be done. Few cases, like attaching already used authentication, were not covered in the screencasts. And today I would like to share with you my solution. It covers most cases, except removing last authentication from user's account. It is up to you, what you will do with that. In my application, after removing last authentication, user can still reset his password via email. You might want to just remove account.

Enjoy!

app/controllers/authentications_controller.rb:
{% highlight ruby %}
class AuthenticationsController < ApplicationController
  before_filter :authenticate_user!, :only => :destroy

  def create
    omniauth = request.env['omniauth.auth']
    authentication = Authentication.find_by_provider_and_uid(omniauth["provider"], omniauth["uid"])
    if current_user
      if authentication && authentication.try(:user) != current_user
        flash[:error] = I18n.t("This %{provider} account is already connected to another account in our service", :provider => authentication.provider)
      elsif authentication.nil?
        current_user.authentications.create!(:provider => omniauth["provider"], :uid => omniauth["uid"])
      end
      redirect_to edit_user_registration_path(current_user)
    else # user logged out
      if authentication # sign in user
        sign_in_and_redirect :user, authentication.user
      else # create new user
        user = User.new.tap {|user| user.apply_authentication(omniauth) }
        if user.save
          sign_in_and_redirect :user, user
        else
          session["omniauth"] = omniauth
          redirect_to new_user_registration_path
        end
      end
    end
  end

  def destroy
    @authentication = current_user.authentications.find(params[:id])
    @authentication.destroy
    redirect_to :back
  end
end
{% endhighlight %}

app/models/authentication.rb:
{% highlight ruby %}
#  create_table "authentications", :force => true do |t|
#    t.integer  "user_id"
#    t.string   "provider"
#    t.string   "uid"
#    t.datetime "created_at"
#    t.datetime "updated_at"
#  end

class Authentication < ActiveRecord::Base
  belongs_to :user
  validates :uid, :provider, :presence => true
  attr_accessor :raw

  def email
    self.raw["user_info"]["email"]
  rescue
  end
end
{% endhighlight %}

config/initializers/omniauth.rb
{% highlight ruby %}
file_name = File.join(File.dirname(__FILE__), "..", "authentication_services.yml")
OMNIAUTH_KEYS = YAML.load(ERB.new(File.new(file_name).read).result)[Rails.env].freeze

Rails.application.config.middleware.use OmniAuth::Builder do
  OMNIAUTH_KEYS.each do |prov, config|
    provider prov, *config
  end
end
{% endhighlight %}

config/authentication_services.yml
{% highlight yaml %}
development:
  facebook:
    - '55a66eefce926c2eb1412222bc04f2787'
    - '2f64ae3613398a553ecccc0da9f75a2b'
    - scope: 'email'
  twitter:
    - 'j7WltZaDVaNcGB8n28aa'
    - 'Rs0zOf1yUaybs1AMW77Ahc2x11KaZWfX2q7ohU'
test:
  facebook:
    - 'test'
    - 'test'
production:
  facebook:
{% endhighlight %}

spec/controllers/authentications_controller_spec.rb:
{% highlight ruby %}
require 'spec_helper'

describe AuthenticationsController do
  before { @user = Factory(:user) }

  describe "POST / from facebook" do
    before do
      @omniauth = {
        'uid' => "12345",
        'provider' => "facebook"
      }
      request.env["omniauth.auth"] = @omniauth
    end

    context "user logged in" do
      before do
        sign_in @user
      end
      context "having no authentications" do
        it "should create authentication " do
          post :create
          @user.reload.should have(1).authentication
        end

        it "should redirect to user's profile" do
          post :create
          response.should redirect_to(edit_user_registration_path(@user))
        end
      end

      context "having facebook authentication" do
        before { @user.authentications.create!(:provider => "facebook", :uid => "12345")}
        it "should not create authentication  " do
          post :create
          @user.reload.should have(1).authentication
        end

        it "should redirect to user's profile" do
          post :create
          response.should redirect_to(edit_user_registration_path(@user))
        end
      end

      context "facebook authentication connected to another account" do
        before do
          @another_user = Factory(:user)
          @another_user.authentications.create!(:provider => "facebook", :uid => "12345")
        end

        it "should disallow to connect accounts" do
          post :create
          @user.reload.should have(0).authentications
          flash[:error].should == "This facebook account is already connected to another account in our service"
          response.should redirect_to(edit_user_registration_path(@user))
        end
      end
    end

    context "user logged out" do
      context "user has attached authentication", "and logging in" do
        before { @user.authentications.create!(:provider => "facebook", :uid => "12345") }
        it "should sign in user" do
          post :create
          controller.send(:current_user).should == @user
        end

        it "should redirect" do
          post :create
          response.should be_redirect
        end
      end
    end

    context "no matching user" do
      context "no extra credentials given" do
        before do
          @user = User.new
          @user.stub!(:save => false)
          User.stub!(:new => @user)
        end

        it "should apply authentication" do
          @user.should_receive(:apply_authentication).with(request.env["omniauth.auth"])
          post :create
        end

        it "should save authentication to session" do
          post :create
          session[:omniauth].should == @omniauth
        end

        it "should redirect to new registration path" do
          post :create
          response.should redirect_to(new_user_registration_path)
        end
      end

      context "facebook credentials given" do
        before { request.env["omniauth.auth"]["user_info"] = {"email" => "example@example.com"} }

        it "should create user" do
          -> { post :create }.should change(User, :count).by(1)
        end

        it "should sign in created user" do
          post :create
          controller.send(:current_user).should_not be_nil
        end

        it "should redirect" do
          post :create
          response.should be_redirect
        end
      end
    end
  end
end
{% endhighlight %}

spec/models/authentication_spec.rb
{% highlight ruby %}
require 'spec_helper'

describe Authentication do
  describe :email do
    context "for facebook" do
      before { @auth = Authentication.new(:provider => 'facebook') }
      it "from raw" do
        @auth.raw = {'user_info' => {'email' => 'artur.roszczyk@gmail.com'}}
        @auth.email.should == 'artur.roszczyk@gmail.com'
      end
    end
  end
end
{% endhighlight %}

[Github Gist is available here](https://gist.github.com/821291)
