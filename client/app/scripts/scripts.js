$(document).ready(function () {
  // event handler to make navbar automatically close when link is clicked
  $(".navbar-nav li a").click(function(event) {
    $(".navbar-collapse").collapse('hide');
  });

  $('#signintab').click(function(event){
    event.preventDefault()
    $(this).tab('show')
  });

  $('#signuptab').click(function(event){
    event.preventDefault()
    $(this).tab('show')
  });
});