---
layout: post
title: Basics of fog and AWS for Rails apps
---

# Basics of fog and AWS for Rails apps

All successful projects grow. In the beginning we usually don't care about scalability so much. The need of it comes often suddenly. You cannot predict effects of being advertised on popular blog or going viral. Then you need to scale up to serve the traffic.

There are many options to fix this. You can start with Heroku, but you might need more flexibility later and move to bare servers on Hetzner. And Hetzner might be a fit for you for several months. But suddenly you meet server's limits, like we did recently, and you have to decide whether to buy another metal or go back into the cloud. Buying second server has own pitfalls and might be tricky to maintain. Amazon's EC2 might be an option, but manual management might be annoying (it was to me).

Here I wan't to show you, how to manage EC2 instances using [fog](http://fog.io/). I believe that crafting own, custom solution for such thing is good idea, because you can expect to have effects pretty fast.

In following posts I want to share knowledge which should help you to establish own toolset for managing your own mini-cloud based on AWS.

## Goals

Each a little larger application can be divided into some logic parts, which might need to scale. In case of our app I'd do following split:

- web workers
- email workers (sending emails in background)
- other background job workers
- PostgreSQL
- memcache
- redis

In the beginning we will focus on scaling web and background workers. Problems with scaling databases come later, so we will deal with them in following posts.

## Project setup

For our custom tool we will use Thor. It’s nicer than Rake and have more feature while it doesn’t have odd DSL in favor of ruby classes. Let’s create a project!

<pre class="terminal"><code>
$ cd ~ &amp;&amp; mkdir -p projects/mycloud
$ cd projects/mycloud

</code></pre>

I use RVM, so I’ll setup RVM gemset:

<pre class="terminal"><code>
$ rvm use 1.9.3-p327@mycloud --create
$ echo "rvm 1.9.3-p327@mycloud --create" > .rvmrc

</code></pre>

I like bundler:

<pre class="terminal"><code>
$ gem install bundler
$ bundle init

</code></pre>

We need to install thor and fog, so put them into `Gemfile` and do `bundle install`

Let’s test thor. Create a `node.thor` file:

<pre class="terminal"><code>
$ mkdir -p lib/tasks
$ touch lib/tasks/node.thor

</code></pre>

Here is content for `node.thor` file:

{% highlight ruby %}
class Node < Thor
  desc "up", "Creates an instance"
  def up
    puts "Instance created"
  end
end
{% endhighlight %}

You can easily test it in the terminal:

<pre class="terminal"><code>
$ thor node:up
Instance created
$

</code></pre>

And that's it. We have simple project ready to grow.

## Configuration

Our first task would be to boot an instance and ensure it's connectivity.
Before that we need to prepare configuration.

### SSH keys

Go to [Key Pairs section of Management Console](https://console.aws.amazon.com/ec2/home?region=eu-west-1#s=KeyPairs) (warning: link leads to EU West 1 zone!) and create new key pair. You will be prompted for name for keypair.
Keys are created on per-region basis. My convention is to provide region name followed by user name (`euwest1_sevos` in my case).

Download your private key (I will use `euwest1_sevos.pem` as key file name)
and place it in `config/keys/` directory in our project.
Remember to change rights to the key file to 600:

<pre class="terminal"><code>
$ chmod 600 config/keys/*

</code></pre>

### credentials.yml

Go [here](https://portal.aws.amazon.com/gp/aws/securityCredentials) and scroll to *Access Credentials* section. Grab AccessKey ID and Secret Access Key. We will need those to make API calls to AWS.

Create `config/credentials.yml` file for our credentials and commons:

{% highlight yaml %}
aws_access_key_id: <your access key id>
aws_secret_access_key: <your secret access key>
region: eu-west-1
key_name: euwest1_sevos
ami: 'ami-c1aaabb5'
instance_type: 't1.micro'
security_group_name: 'mycloud'
{% endhighlight %}

Now, we can use these data to manage instances.

#### On AMI

I use current (as of writing this article) Ubuntu 12.04 64-bit AMI
from EU West datacenter

#### On security group

Amazon uses security groups to protect instances from unwanted traffic.
For sake of simplicity let's create one security group opening port 22 (SSH)
for world. Go to [Security Groups](https://console.aws.amazon.com/ec2/home?region=eu-west-1#s=SecurityGroups)
and crete new group. Name it `mycloud` or whatever you'll use later as
`security_group_name`, provide description and leave VPC setting unchanged.

After creating security group set it up for accepting SSH connection.

![The Passionate Programmer book](/img/2012/12/31/basics-of-fog-and-aws-for-rails-apps/security-group-setup.png)

Remember to click *Add Rule* and apply changes!

## Booting an instance

Let's edit `up` method and do some magic!

{% highlight ruby %}
require 'yaml'
require 'fog'

class Node < Thor
  desc "up NAME", "Creates an instance"
  def up(instance_name)
    server = compute.servers.create(
        image_id:         config['ami'],
        flavor_id:        config['instance_type'],
        key_name:         config['key_name'],
        tags:             {
                            'Name' => instance_name
                          },
        groups:           config['security_group_name'],
        private_key_path: private_key_path
    )

    server.wait_for do
      ready?
    end

    say "Instance ready. You can connect to it using following command:", :green
    say "  ssh -i #{private_key_path} ubuntu@#{server.dns_name}"
  end

  private

  def compute
    @compute ||= Fog::Compute.new provider: 'AWS',
                                  region: config['region'],
                                  aws_access_key_id: config['aws_access_key_id'],
                                  aws_secret_access_key: config['aws_secret_access_key']
  end

  def config
    @config ||= YAML.load(File.read(File.join('config', 'credentials.yml')))
  end

  def private_key_path
    File.expand_path(File.join('config', 'keys', "#{config['key_name']}.pem"))
  end
end
{% endhighlight %}

### Testing

Now it's time to check our code. Type in the console:

<pre class="terminal"><code>
$ thor node:up blog

</code></pre>

After several seconds you should see similar message:

<pre class="terminal"><code>
Instance ready. You can connect to it using following command:
ssh -i /Users/sevos/Projects/mycloud/config/keys/euwest1_sevos.pem
ubuntu@ec2-79-125-87-82.eu-west-1.compute.amazonaws.com

</code></pre>

Just copy the SSH command and try to connect to the server. Note that even if server seems
to be ready, sshd server might be not up yet. Just wait few seconds and try again.

## Summary

That's it for today. Turn off instance manually using AWS Console. Select an instance
and from Actions menu select Terminate command.

We prepared a thor task for creating AWS instance from an AMI image.
We still need some role-system, since we don't care about single instance.

In next posts I will write also about provisioning and grouping instances.




