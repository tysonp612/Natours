class APIFeature {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    //1B Advanced filtering: less than, less and equal then...

    let queryStr = JSON.stringify(queryObj);

    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // Function to replace gte.. with $gte...

    this.query = this.query.find(JSON.parse(queryStr));
    return this; //return the entire object in order to have access to ohter methods
  }
  sort() {
    if (this.queryString.sort) {
      //       //check if we have sort ?
      const sortBy = this.queryString.sort.split(',').join(' '); //remove ',' between 2 sort requirement
      this.query = this.query.sort(sortBy); // sort excecuted
    } else {
      this.query = this.query.sort('_id');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; //conver to number
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;
    // page=2&limit=10 meaning 1-10 on page 1, 11-20 on page 2, 21-30 on page 3, then skip 10 result
    //limit means how many data we send on 1 page
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = APIFeature;
