// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or vendor/assets/javascripts of plugins, if any, can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/sstephenson/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery
//= require jquery_ujs
//= require jquery.serializejson.min
//= require_tree .

$.FollowToggle = function (el, options) {
  this.$el = $(el);
  this.userId = $(el).attr("data-user-id") || options.userId;
  this.followState = $(el).attr("data-follow-state") || options.followState;
  this.render();
  this.$el.on("click", this.handleClick.bind(this));
};

$.FollowToggle.prototype.render = function () {
  if (this.followState === "followed") {
    this.$el.attr('data-follow-state', "followed");
    this.$el.text('Unfollow!');
  } else {
    this.$el.attr('data-follow-state', "unfollowed");
    this.$el.text('Follow!');
  }
  this.$el.prop('disabled', false);
};

$.FollowToggle.prototype.handleClick = function (event){
  event.preventDefault();
  var method, data;
  var url = "http://localhost:3000/users/" + this.userId + "/follow";  
  if (this.followState === "followed"){
    method = "delete";  
  } else {
    method = "post";
  }
  
  $.ajax({
    url: url,
    type: method,
    dataType: "json",
    data: {"user_id": this.userId},
    success: function(response) {
      if (method === "delete") {
        this.followState = "unfollowed";
      } else {
        this.followState = "followed";
      }
      this.render();
    }.bind(this)
  })
  this.$el.prop('disabled', true);
}

$.fn.followToggle = function (options) {
  return this.each(function () {
    new $.FollowToggle(this, options);
  });
};


$.UserSearch = function (el) {
  this.$el = $(el);
  this.$input = this.$el.find('input');
  this.$ul = this.$el.find('.users');
  this.$input.on("input", this.handleInput.bind(this));
};

$.UserSearch.prototype.renderResults = function (users) {
  this.$ul.empty();

  users.forEach(function (user) {
    var $li = $("<li>");
    var $a = $("<a>");
    var userUrl = "http://localhost:3000/users/" + user.id;
    $a.attr("href", userUrl);
    $a.text(user.username);  
    var $button = $('<button>');
    $button.addClass("follow-toggle");
    var followed = user.followed ? "followed" : "unfollowed";
    var options = {
      "userId" : user.id,
      "followState" : followed
    }
    $button.followToggle(options);
    $li.append($a);
    $li.append($button);
    this.$ul.append($li);
  }.bind(this))
}

$.UserSearch.prototype.handleInput = function(event) {
  var $input = $(event.currentTarget);
  $.ajax({
    url: "http://localhost:3000/users/search",
    type: "get",
    dataType: "json",
    data: {"query": $input.val()},
    success: function (response) {
      this.renderResults(response);
    }.bind(this)
  })
};

$.fn.usersSearch = function () {
  return this.each(function () {
    new $.UserSearch(this);
  });
};


$.TweetCompose = function (el) {
  this.$el = $(el);
  this.$textarea = this.$el.find("textarea");
  this.charsLimit = 140;
  this.$el.on("submit", this.submit.bind(this));
  this.$textarea.on("input", this.updateCharsLeft.bind(this));
  var feedId = this.$el.attr('data-tweets-ul');
  this.$feedUl = $(feedId);
  this.$el.find("a.add-mentioned-user").on("click", this.addMentionedUser.bind(this));
  this.$el.find("div.mentioned-users").on("click", "a.remove-mentioned-user",this.removeMentionedUser.bind(this));
  
};

$.TweetCompose.prototype.removeMentionedUser = function (event){
  var $currentParent = $(event.currentTarget.parentElement);
  $currentParent.remove();
}

$.TweetCompose.prototype.addMentionedUser = function (event) {
  var $scriptTag = this.$el.find("script.mentioned-script");
  var $divMentionedUsers = $("div.mentioned-users");
  var $divMention = $("<div>");
  $divMention.append($scriptTag.html());
  var $removeAnchor = $("<a>");
  $removeAnchor.attr("href", "javascript:void(0)");
  $removeAnchor.addClass("remove-mentioned-user");
  $removeAnchor.text("Remove Mention");
  $divMention.append($removeAnchor);

  $divMentionedUsers.append($divMention);
};

$.TweetCompose.prototype.updateCharsLeft = function (event) {
  var $strongEl = this.$el.find(".chars-left");
  var $textarea = $(event.currentTarget);
  var tweetLength = $textarea.val().length;
  this.charsLeft = this.charsLimit - tweetLength;
  $strongEl.html(this.charsLeft)
}

$.TweetCompose.prototype.submit = function (event){
  event.preventDefault();
  var $tweetData = $(event.currentTarget);
  var jsonInfo = $tweetData.serializeJSON();
  //jsonInfo.tweet.content
  $.ajax({
    url: "http://localhost:3000/tweets",
    type: "post",
    dataType: "json",
    data: jsonInfo,
    success: this.handleSuccess.bind(this)
  })
  var allInputs = $(":input");
  allInputs.prop("disabled", true);
};

$.TweetCompose.prototype.handleSuccess = function (response){
  this.clearInput();
  var allInputs = $(":input");
  allInputs.prop("disabled", false);
  var tweet = JSON.stringify(response);
  var $li = $("<li>");
  $li.text(tweet);
  this.$feedUl.prepend($li);
}

$.TweetCompose.prototype.clearInput = function (){
  this.$el.find("textarea").val('');
  this.$el.find("select").empty();
}

$.fn.tweetCompose = function () {
  return this.each(function () {
    new $.TweetCompose(this);
  });
};

$.InfiniteTweets = function (el) {
  this.$el = $(el);
  this.$ul = this.$el.find("ul#feed");
  this.$a = this.$el.find("a.fetch-more");
  this.maxCreatedAt = null;
  this.$a.on("click", this.fetchTweets.bind(this));
};

$.InfiniteTweets.prototype.insertTweets = function (tweets){
    tweets.forEach( function (tweet){
      var $li = $("<li>");
      $li.text(JSON.stringify(tweet));
      this.$ul.append($li);
    }.bind(this))
    var $lastTweet = this.$ul.find("li:last-child");
    var tweetStr = $lastTweet.text();
    this.maxCreatedAt = JSON.parse(tweetStr).created_at;
}

$.InfiniteTweets.prototype.fetchTweets = function ( event ){
  var data;
  if (this.maxCreatedAt != null) {
    data = { "max_created_at": this.maxCreatedAt}
  }
  $.ajax({
    url: "http://localhost:3000/feed",
    type: "get",
    data: data,
    dataType: "json",
    success: function (response){      
      this.insertTweets(response);
    }.bind(this)
  })
};


$.fn.infiniteTweets = function () {
  return this.each(function () {
    new $.InfiniteTweets(this);
  });
};


