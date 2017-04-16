const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');


const should = chai.should();

const { BlogPost } = require('../models');
const { runServer, app, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
    console.info('Currently seeding blog post data');
    const seedData = [];

    for (let i = 1; i <= 10; i++) {
        seedData.push(createBlogPostData());
    }

    return BlogPost.insertMany(seedData);
}

function createBlogPostData() {
    return {
        author: {
            firstName: faker
                .name
                .firstName(),
            lastName: faker
                .name
                .lastName()
        },
        content: faker
            .lorem
            .paragraph(),
        title: faker
            .lorem
            .words(),
        created: faker
            .date
            .past()
    }
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose
        .connection
        .dropDatabase();
}

describe('Blog Posts API', function() {

    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogPostData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    describe('GET', function() {

        it('should return existing blog posts', function() {
            let res;
            return chai
                .request(app)
                .get('/posts')
                .then(function(_res) {
                    res = _res;
                    res
                        .should
                        .have
                        .status(200);
                    res
                        .body
                        .should
                        .have
                        .length
                        .of
                        .at
                        .least(1);
                    return BlogPost.count();
                })
                .then(function(count) {
                    res
                        .body
                        .should
                        .have
                        .a
                        .lengthOf(count);
                });
        });

        it('should return posts with correct fields', function() {
            let resPost;
            return chai
                .request(app)
                .get('/posts')
                .then(function(res) {
                    res
                        .should
                        .have
                        .status(200);
                    res.should.be.json;
                    res
                        .body
                        .should
                        .have
                        .length
                        .of
                        .at
                        .least(1);

                    res
                        .body
                        .forEach(function(post) {
                            post
                                .should
                                .be
                                .a('object');
                            post
                                .should
                                .include
                                .keys('id', 'author', 'title', 'content', 'created');
                        });
                    resPost = res.body[0];
                    return BlogPost.findById(resPost.id);
                })
                .then(function(post) {
                    resPost
                        .id
                        .should
                        .equal(post.id);
                    resPost
                        .author
                        .should
                        .equal(post.authorName);
                    resPost
                        .title
                        .should
                        .equal(post.title);
                    resPost
                        .content
                        .should
                        .equal(post.content);

                });
        });

    });

    describe('POST', function() {

        it('should add new post', function() {
            const newPost = createBlogPostData();

            return chai
                .request(app)
                .post('/posts')
                .send(newPost)
                .then(function(res) {
                    res
                        .should
                        .have
                        .status(201);
                    res.should.be.json;
                    res
                        .body
                        .should
                        .be
                        .a('object');
                    res
                        .body
                        .should
                        .include
                        .keys('id', 'author', 'title', 'content', 'created');
                    res
                        .body
                        .title
                        .should
                        .equal(newPost.title);
                    res.body.id.should.not.be.null;
                    res
                        .body
                        .author
                        .should
                        .equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
                    res
                        .body
                        .content
                        .should
                        .equal(newPost.content);
                    return BlogPost.findById(res.body.id);
                })
                .then(function(post) {
                    post
                        .author
                        .firstName
                        .should
                        .equal(newPost.author.firstName);
                    post
                        .author
                        .lastName
                        .should
                        .equal(newPost.author.lastName);
                    post
                        .title
                        .should
                        .equal(newPost.title);
                    post
                        .content
                        .should
                        .equal(newPost.content);

                });
        });
    });

    describe('PUT', function() {
        it('should update information you send', function() {
            const updateData = {
                title: 'The Call of the Wild',
                content: 'Trololololol'
            };

            return BlogPost
                .findOne()
                .exec()
                .then(function(post) {
                    updateData.id = post.id;
                    return chai
                        .request(app)
                        .put(`/posts/${post.id}`)
                        .send(updateData);
                })
                .then(function(res) {
                    res
                        .should
                        .have
                        .status(201);
                    return BlogPost
                        .findById(updateData.id)
                        .exec();
                })
                .then(function(post) {
                    post
                        .title
                        .should
                        .equal(updateData.title);
                    post
                        .content
                        .should
                        .equal(updateData.content);
                });
        });
    });

    describe('DELETE', function() {

        it('delete Post by its id', function() {
            let post;
            return BlogPost
                .findOne()
                .exec()
                .then(function(_post) {
                    post = _post;
                    return chai
                        .request(app)
                        .delete(`/posts/${post.id}`);
                })
                .then(function(res) {
                    res
                        .should
                        .have
                        .status(204);
                    return BlogPost
                        .findById(post.id)
                        .exec();
                })
                .then(function(_post) {
                    should
                        .not
                        .exist(_post);
                });
        });
    });

});