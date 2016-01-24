const alimentProvider = function alimentProvider(){

    return {

        search(key){
            return [{
                id : 'tacos',
                name : 'tacos kit'
            }];
        },

        getOne(id){
            return {
                id : 'tacos',
                name : 'tacos kit'
            };
        }
    };
};

export default alimentProvider;
