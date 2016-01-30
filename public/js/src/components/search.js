const searchComponent = function searchComponent (){

    return {
        template(){
            return `
                <form>
                    <label for="search">What did you eat today ?</label>
                    <div>
                        <input type="text" name="search" placeholder="Tacos, coffee, bannana, ..." />
                        <input type="button" value="Search" />
                    </div>
                </form>`;
        },

        init(){
            const root = document.createElement('div');
            root.classList.add('root');
            root.innerHTML = this.template();

            this.fragment = document.createDocumentFragment();
            this.fragment.appendChild(root);

            const button = this.fragment.querySelector('input[type=button]');
            const searchField = this.fragment.querySelector('input[name=search]');

            button.addEventListener('click', e => {

                window.console.log(e, searchField.value);
            });
            return this;
        },

        render(container){
            if(this.fragment && container instanceof HTMLElement){
                container.appendChild(this.fragment.querySelector('.root > *'));
            }
            return this;
        }
    };
};

export default searchComponent;
