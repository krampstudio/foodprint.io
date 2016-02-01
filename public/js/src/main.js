import searchComponent from './components/search.js';

function main(){
    searchComponent()
        .init()
        .render(document.querySelector('.search'));
}

main();
