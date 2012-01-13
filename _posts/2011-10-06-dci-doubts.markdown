---
layout: post
title: DCI doubts
---

# DCI doubts

> Background:
> *I am working on an application which brings new user interface for legacy
> system used by customer. There is basic model in the legacy system: Department.
> My customer wants to see several statistics related to each of his departments.
> That's my duty.*

As I started modelling business domain in my app I wanted to keep things as simple
as possible. I wanted also try out DCI finally. Time had come ;-)

My first idea was to create Department model and let it to play roles in the app (bad idea, but keep reading):
{% highlight ruby %}
class Department << ActiveRecord::Base
end

class DepartmentsController
  def update_stock_value
    stock = Department.find(params[:id]).extend Roles::Stock
    stock.update
  end
end

module Roles
  module Stock
    def update
      # fetch value from external application and store
    end

    def value
      stock_value
    end
  end
end
{% endhighlight %}

However I realized that there was something missing. Obviously there was missing
a relation that Department certainly has one Stock. Just like that. I was copying business model from legacy app instead of creating new model for this domain.

I am going to refactor that piece of code and I have two choices:

Keep going with DCI and let only actors to play roles
{% highlight ruby %}
class StocksController
  def update
    stock = Stock.where(:department_id => params[:department_id]).first
    current_user.extend Role::StockManager
    current_user.update stock
  end
end

module Roles::StockManager
  def update(stock)
    stock.update_attribute :value,
                           Legacy::Department.find(stock.department.id).stock_value
  end
end

class Department < ActiveRecord::Base
  has_one :stock
end

class Stock < ActiveRecord::Base
  belongs_to :department
end

class Legacy::Department < ActiveResource::Base
  # stuff here
end
{% endhighlight %}

Second option was to go back to class-oriented paradighm:
{% highlight ruby %}
class Department < ActiveRecord::Base
  has_one :stock
end

class Stock < ActiveRecord::Base
  belongs_to :department

  def update
    update_attribute :value, Legacy::Department.find(department.id).stock_value
  end
end

class Legacy::Department < ActiveResource::Base
  # stuff here
end

class StocksController
  def update
    Stock.where(:department_id => params[:department_id]).first.udpate
  end
end
{% endhighlight %}

My main concern is that DCI in those examples looks like to complex to me.
Why we shouldn't place more emphasis on better model granulation? If comes
to the classic example with e-commerce: an user as a buyer: why we can't use classic decorator pattern? Buyer might be a model being a decorator for User model.
And that's it, no roles, no additional layer.
