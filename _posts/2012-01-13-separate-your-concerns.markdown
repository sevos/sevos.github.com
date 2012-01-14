---
layout: post
title: Separate your concerns
---

# Separate your concerns

*This post is written in response to [Keep your privates close](http://robots.thoughtbot.com/post/1986730994/keep-your-privates-close) of Thoughtbot*

At the beginning I must admit that previously I have never thought, that we
could use private keyword in THIS way. First time I met this approach
in my new outsourced project with code written by former devs. When I opened
random file, I saw ugliness written in following style:

{% highlight ruby %}
class User < ActiveRecord::Base
  has_many :tickets
  has_many :events

  # -------------------------------------
  # Recent tickets
  # -------------------------------------
  def most_recent_ticket
    # huh, obviously code here
  end

  def recent_tickets

  end
  private :recent_tickets

  # more public and private methods
  # …

  # -------------------------------------
  # API Keys
  # -------------------------------------
  after_create :create_api_keys

  def create_api_keys

  end
  private :create_api_keys

  def random_key

  end
  private :random_key
end
{% endhighlight %}

I hope, you've got the idea. When I asked why do we need to follow this convention,
I've got answer that this solves problem of vertical distance between public and
private methods related to each other. It was surprise for me, because usually I put
`FIXME` comment in large files.

During discussion my opponent sent me a link to the mentioned blog post from
Thoughtbot. After reading it I must agree with author at one point.

## Vertical distance is bad

First programs ever written had mostly one file. Developers were helping themselves
by separating code with comments. Later file inclusion has been introduced enabling
developers to split code into several files. Then came functions, namespaces, classes
and modules. Everything what makes the code more readable and beautiful.

It is not only about look&feel. The code, we write, should be maintainable.

Someone said once that you should always keep in mind that developer
coming after you is psychopath, who knows, where do you live. It might be just you,
after few months. Making code maintainable reduces costs of project. It's okay to not
care about that when prototyping, but is not when you write a real project,
especially an for external client.

## Let's get to the point

The need of grouping methods together exposes something to us. Usually we group them by some concern,
which corresponds to *a part* of object's responsibilities.
This mean that object, when realizing those responsibilities, plays a role in our system. Yea, I know, you may think now, that I am next guy selling [DCI](http://en.wikipedia.org/wiki/Data,_Context,_and_Interaction) or some other pattern. DCI is in fact quite nice solution, but I really don't care how do you split your code, unless it is technique from previous century.

When your class is getting bigger, you can easily extract concerns into separate module. Your main file becomes a list of contents. First step of refactoring of example above would be following:

{% highlight ruby %}
# app/models/user.rb
class User < ActiveRecord::Base
  include Tickets
  include ApiKeys

  has_many :events
end
{% endhighlight %}

{% highlight ruby %}
# app/models/user/tickets.rb
module User::Tickets
  extend ActiveSupport::Concern

  included do
    has_many :tickets
  end

  def most_recent_ticket
    # huh, obviously code here
  end

  private
    def recent_tickets

    end
end
{% endhighlight %}

{% highlight ruby %}
# app/models/user/api_keys.rb
module User::ApiKeys
  extend ActiveSupport::Concern

  included do
    after_create :create_api_keys
  end

  private
    def create_api_keys

    end

    def random_key

    end
end
{% endhighlight %}

For me it is much better. Please note that this approach is in early stage and few things should be discussed, like:
* should we use `ActiveSupport::Concern` and extract relations to modules?
* should we include at class' level or extend on object's level? (Personally if comes
  to AR classes I preffer includes - I agree that [DCI at AR level is wrong](http://andrzejonsoftware.blogspot.com/2012/01/dci-and-rails-lessons-learnt.html))
* how we deal with common code?
* how to deal with `load_missing_constant` ambiguous behaviour?  
  It happens when you name your nested models like classes or modules being visible in global scope, consider `User::Ticket` and `Ticket`. Rails somehow fallbacks to `::Ticket` when including `User::Ticket`. I bypass this by writing `require_relative 'user/ticket' and include User::Ticket`. I know, it is not perfect but good enough for now.


## What's next?

Often we get to the point, when a model in our projects grows too big. We did tend always to follow [Skinny controller, fat model principle](http://weblog.jamisbuck.org/2006/10/18/skinny-controller-fat-model), but models have got extremely big - I saw files with 300 LoC, who bids more? Of course, we can live with that. We can also live without dishwashers and RSS (both are big time savers to me).

After separating your concerns, you may discover that persistence is also a concern. This will change the way you think about domain models drastically. I haven't get to this point or/and I am not brave enough yet to experiment with PORO models in projects for external clients, but for sure I will give it a try in my next side-project. However this is topic for next post ;-).

Some of you may think, why bother? Ruby is beautiful. Most of use came here from Java, PHP and other languages. Ruby let us express our thoughts easier than many of them. Let's don't break this with ugly spaghetti code. Don't go back.



