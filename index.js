const contractSource = `
contract MovieVote =

  record movie =
    { creatorAddress : address,
      url            : string,
      name           : string,
      text           : string,
      voteCount      : int }

  record state =
    { movies      : map(int, movie),
      moviesLength : int }

  entrypoint init() =
    { movies = {},
      moviesLength = 0 }

  entrypoint getMovie(index : int) : movie =
    switch(Map.lookup(index, state.movies))
      None    => abort("There was no movie with this index registered.")
      Some(x) => x

  stateful entrypoint registerMovie(url' : string, name' : string, text' : string) =
    let movie = { creatorAddress = Call.caller, url = url', name = name', text = text', voteCount = 0}
    let index = getMoviesLength() + 1
    put(state{ movies[index] = movie, moviesLength = index })

  entrypoint getMoviesLength() : int =
    state.moviesLength

  stateful entrypoint voteMovie(index : int) =
    let movie = getMovie(index)
    Chain.spend(movie.creatorAddress, Call.value)
    let updatedVoteCount = movie.voteCount + Call.value
    let updatedMovies = state.movies{ [index].voteCount = updatedVoteCount }
    put(state{ movies = updatedMovies })
`;


const contractAddress = 'ct_3SmcKJYxxrmh8FSkqDafkD47m1MFpT6MXg6ezKojKiqP5Fm4q';

var client = null;

var movieArray = [];

var moviesLength = 0;

function renderMovies() {

  movieArray = movieArray.sort(function(a,b){return b.votes-a.votes})

  let template = $('#template').html();

  Mustache.parse(template);

  let rendered = Mustache.render(template, {movieArray});

  $('#movieBody').html(rendered);
}


async function callStatic(func, args) {

  const contract = await client.getContractInstance(contractSource, {contractAddress});

  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));

  const decodedGet = await calledGet.decode().catch(e => console.error(e));

  return decodedGet;
}


async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});

  const calledSet = await contract.call(func, args, {amount: value}).catch(e => console.error(e));

  return calledSet;
}


window.addEventListener('load', async () => {

  $("#loader").show();


  client = await Ae.Aepp();


  moviesLength = await callStatic('getMoviesLength', []);


  for (let i = 1; i <= moviesLength; i++) {


    const movie = await callStatic('getMovie', [i]);


    movieArray.push({
      creatorName: movie.name,
      movieUrl: movie.url,
      movieText: movie.text,
      index: i,
      votes: movie.voteCount,
    })
  }


  renderMovies();


  $("#loader").hide();
});


jQuery("#movieBody").on("click", ".voteBtn", async function(event){
  $("#loader").show();

  let value = $(this).siblings('input').val(),
      index = event.target.id;


  await contractCall('voteMovies', [index], value);


  const foundIndex = movieArray.findIndex(movie => movie.index == event.target.id);

  movieArray[foundIndex].votes += parseInt(value, 10);

  renderMovies();
  $("#loader").hide();
});


$('#registerBtn').click(async function(){
  $("#loader").show();

  const name = ($('#regName').val()),
        url = ($('#regUrl').val());
        text = ($('#regText').val());


  await contractCall('registerMovie', [url, name, text], 0);


  movieArray.push({
    creatorName: name,
    movieUrl: url,
    movieText: text,
    index: movieArray.length+1,
    votes: 0,
  })

  renderMovies();
  $("#loader").hide();
});
