---
layout: post
title: Subscription tracking in Sendgrid and Rails 4
---

# Subscription tracking in Sendgrid and Rails 4

Few days ago I extracted mailer classes out of our monolith app. I created a new, small Rails 4 application which consumes RabbitMQ queue and sends emails to users. We use Sendgrid's subscription tracking. We use particularly a placeholder, which Sendgrid replaces by unsubscription url.

{% highlight ruby %}
  # in mailer

  sendgrid_subscriptiontrack_text(:replace => '[unsubscribe]')

  # in template

  <a href="\[unsubscribe\]">click here.</a>
{% endhighlight %}

The problem was, that the placeholder _\[unsubscribe\]_ was replaced by a bogus URL like `x-msg://447/\[unsubscribe\]`. It turns out, that Rails 4 encodes automatically all URLs in emails. 

## The fix

Sendgrid does not decode these URLs, so I needed to encode the placeholder.

{% highlight ruby %}
  # in mailer

  sendgrid_subscriptiontrack_text(:replace => '%5Bunsubscribe%5D')
{% endhighlight %}

I hope that this will save you some time.
