import convertToCamelCase from './utils/camel-case.js';
import convertToJson from './utils/convert-to-json.js';
import debounce from './utils/debounce.js';
import validate from './utils/validators.js';

class ContactsModel {
  static ROUTES = {
    getContactsRoute: () => '/api/contacts',
    getContactRoute: id => `/api/contact/${id}`,
    addContactRoute: () => '/api/contacts',
    deleteContactRoute: id => `/api/contacts/${id}`,
    updateContactRoute: id => `/api/contacts/${id}`
  }
  constructor() {
    this.contacts = [];
    this.tags = [];
  }
  
  getContacts() {
    return [...this.contacts];
  }

  getContact(id) {
    return this.getContacts().find(contact => contact.id === id);
  }

  getTags() {
    let tags = new Set();
    this.contacts.forEach(contact => {
      if (contact.tags && contact.tags.length) contact.tags.forEach(tag => tags.add(tag));
    });

    this.tags = [...tags];

  }
  
  filterContacts(term) {
    return this.getContacts().filter(contact => contact.fullName.toLowerCase().includes(term.toLowerCase()));
  }

  filterByTag(tag) {
    return this.getContacts().filter(contact => !!contact.tags).filter(contact => contact.tags.map(tag => tag.toLowerCase()).includes(tag.toLowerCase()));
  }

  convertTagsToArr(row) {
    if (row.tags) row.tags = row.tags.split(',');
  }

  async fetchContacts() {
    try {
      let res = await fetch(ContactsModel.ROUTES.getContactsRoute());
      let data = await res.json();
      data.forEach(row => this.convertTagsToArr(row));
      this.contacts = convertToCamelCase(data);
      this.getTags();
    } catch(err) {
      throw new Error('Failed to retrieve');
    }
  }

  async addContact(json) {
    try {
      let res = await fetch(ContactsModel.ROUTES.addContactRoute(), {
        method: 'POST',
        body: JSON.stringify(json),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let contact = await res.json();
      this.convertTagsToArr(contact);
      this.contacts.push(convertToCamelCase(contact));
    } catch(err) {
      console.log(err);
    }
  }
  
  async updateContact(id, data) {
    try {
      console.log('updating')
      let res = await fetch(ContactsModel.ROUTES.updateContactRoute(id), {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let updatedContact = await res.json();
      this._replaceContact(+id, this.convertTagsToArr(updatedContact));
    } catch(err) {
      console.log(err);
    }
  }

  async deleteContact(id) {
    try {
      let res = await fetch(ContactsModel.ROUTES.deleteContactRoute(id), {
        method: 'DELETE'
      });
      if (res.status === 204) this._removeContact(id);
    } catch(err) {
      console.log(err);
    }
  }

  _replaceContact(id, updatedContact) {
    let contactIdx = this.contacts.findIndex(contact => contact.id === id);
    this.contacts[contactIdx] = Object.assign(this.contacts[contactIdx], updatedContact);
  }

  _removeContact(id) {
    this.contacts = this.contacts.filter(contact => contact.id !== id);
  }

  addTag(tag) {
    this.tags.push(tag);
  }

}



class ContactsView {
  constructor() {
    this.contentEl = document.querySelector('#content');
    this.contactsCards = document.querySelector('#contacts-cards');
    this.displayNewContactFormBtn = document.querySelector('#add-contact');
    this.newContactFormContainer = document.querySelector('#form-container');
    this.newContactForm = document.querySelector('#new-contact-form');
    this.searchBar = document.querySelector('#search');
    this.cancelNewContactBtn = document.querySelector('#cancel-btn');
    this.contactsNavBar = document.querySelector('#contacts-cards-nav');
    this.addContactNavBar = document.querySelector('#add-contact-nav');
    this.invalidMessageDivs = document.querySelectorAll('.invalid');
    this.tagsContainer = document.querySelector('#tags-container');
    this.tagsList = document.querySelector('#tags-list');
    this.tagInput = document.querySelector('#tags-input');

    this.templates = document.querySelectorAll('[type="text/x-handlebars"]');
    this.templatesTable = {};
    this.saveTemplates();
    this.registerPartials();
  }

  saveTemplates() {
    this.templates.forEach(template => this.templatesTable[template.id] = Handlebars.compile(template.innerHTML));
  }

  registerPartials() {
    Array.from(this.templates).filter(template => {
      return template.dataset.partial === 'true'
    }).forEach(partial => {
      Handlebars.registerPartial(partial.id, partial.innerHTML);
    });
  }

  getTemplate(id) {
    return this.templatesTable[id];
  }

  displayContacts(contacts) {
    if (!this.newContactFormContainer.classList.contains('hidden')) this.newContactFormContainer.classList.add('hidden');
    if (this.contactsCards.classList.contains('hidden')) this.contactsCards.classList.remove('hidden');
    if (this.contactsNavBar.classList.contains('hidden')) this.contactsNavBar.classList.remove('hidden');
    if (!this.addContactNavBar.classList.contains('hidden')) this.addContactNavBar.classList.add('hidden');

    this.resetContacts();

    if (!contacts.length) {
      this.contactsCards.innerHTML = `<h2>No contacts match this filter</h2>`
      return;
    }
    let contactsTemplate = this.getTemplate('contacts');
    let filledTemplate = contactsTemplate({ contacts });
    this.contactsCards.insertAdjacentHTML('beforeend', filledTemplate);
  }

  fillSelectOptions(tags) {
    function createOption(val) {
      let option = document.createElement('option');
      option.value = val;
      option.textContent = val;
      option.classList.add('tag');
      return option;
    }

    let select = document.querySelector('#tags-select');
    select.setAttribute('size', tags.length);
    if (Array.isArray(tags)) {
      select.innerHTML = "";
      tags.forEach(tag => {
        select.appendChild(createOption(tag));
      });
    } else select.appendChild(createOption(tags));

  }
  
  displayNewContactForm(tags) {
    this.toggleDisplay(this.contactsCards);
    this.toggleDisplay(this.newContactFormContainer);
    this.toggleDisplay(this.contactsNavBar);
    this.toggleDisplay(this.addContactNavBar);
    this.fillSelectOptions(tags); 
  }

  resetContacts() {
    this.contactsCards.innerHTML = "";
  }

  toggleDisplay(el) {
    el.classList.toggle('hidden');
  }

  clearInvalidMessages() {
    Array.from(this.invalidMessageDivs).forEach(el => el.textContent = "");
  }

  displayTags(tags) {
    tags.forEach(tag => {
      this.tagsList.appendChild(this._createTag(tag));
    })
  }

  addTag(tag) {
    this.tagsList.appendChild(this._createTag(tag));
    this.fillSelectOptions(tag);
  }

  _createTag(tag) {
    let span = document.createElement('span');
    span.classList.add('tag');
    span.classList.add('draggable');
    span.setAttribute('data-tag', tag);
    span.textContent = tag;
    span.setAttribute('draggable', true);
    return span;
  }

  clearPreviouslyActiveTag(target) {
    let potentialActives = Array.from(this.tagsList.children).filter(el => el !== target);
    potentialActives.forEach(el => el.classList.remove('active'));
  }
}



class ContactsController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  
    this.model.fetchContacts().then(() => {
      this.view.displayContacts(this.model.getContacts());
      this.view.displayTags(this.model.tags);
      this.bind();
    });
  }

  bind() {
    this.view.displayNewContactFormBtn.addEventListener('click', this.handleNewContactFormDisplay.bind(this));
    this.view.newContactForm.addEventListener('submit', this.handleNewContactSubmit.bind(this));
    this.view.searchBar.addEventListener('keyup', debounce(this.handleSearchKeyup.bind(this), 100));
    this.view.cancelNewContactBtn.addEventListener('click', this.handleCancelClick.bind(this));

    document.addEventListener('click', async e => {
      if (e.target.classList.contains('delete-contact-btn')) {
        await this.handleContactDelete(e);
      }

    });
    document.addEventListener('change', async e => {
      if (e.target.classList.contains('edit-input')) {
        await this.handleInputChange(e);
      }
    });

    this.view.tagInput.addEventListener('keyup', this.handleAddTag.bind(this));
    this.view.tagsList.addEventListener('click', this.handleTagFilter.bind(this));
    
    let inputs = document.querySelectorAll('.edit-input');
    inputs.forEach(el => {
      el.addEventListener('change', this.handleInputChange.bind(this));
    });

    this.drag()();
  }

  drag() {
    let dragged = null;
    
    return () => {

      document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('draggable')) {
          dragged = e.target;
        }
      });
      
      document.addEventListener('dragover', e => {
        if (e.target.classList.contains('tags')) {
          e.preventDefault();
          e.target.classList.add('draggedOver');
        }
      });

      document.addEventListener('dragleave', e => {
        e.preventDefault();
        if (e.target.classList.contains('tags')) {
          if (e.target.classList.contains('draggedOver')) e.target.classList.remove('draggedOver');
        }
      });
      
      document.addEventListener('drop', e => {
        e.preventDefault();

        function findDropZone() {
          return e.target.classList.contains('drop') ? 
            e.target : 
            e.target.parentNode.classList.contains('drop') ? 
              e.target.parentNode : 
              e.target;
        }

        let target = findDropZone();
        if (target.classList.contains('drop')) {
          let id = +target.parentNode.dataset.id;

          target.classList.remove('draggedOver');
          
          let contact = this.model.getContact(id);
          let currentTags = contact.tags || [];
          let newTag = dragged.dataset.tag;
          if (!currentTags.includes(newTag)) currentTags.push(newTag)
          this.model.updateContact(id, { tags: currentTags.join(',') }).then(() => {
            this.view.displayContacts(this.model.getContacts());
          });
        }

        dragged = null;
      });
    }
  }
  
  handleNewContactFormDisplay(e) {
    this.view.displayNewContactForm(this.model.tags);
  }

  async handleNewContactSubmit(e) {
    e.preventDefault();
    this.view.clearInvalidMessages();

    if (e.submitter.tagName === 'BUTTON') {
      let formData = new FormData(e.target);
      let isValid = validate(e.target);      
      if (isValid) {
        await this.model.addContact(convertToJson(formData));
        this.view.newContactForm.reset();
        this.view.displayContacts(this.model.getContacts());
      }
    }
  }

  async handleContactDelete(e) {
    let id = +e.target.dataset.id;
    await this.model.deleteContact(id);
    this.view.displayContacts(this.model.getContacts());
  }

  handleSearchKeyup(e) {
    let searchTerm = e.target.value;
    let filteredContacts = this.model.filterContacts(searchTerm);
    this.view.displayContacts(filteredContacts, searchTerm);
    if (this.view.searchBar.classList.contains('shake')) this.view.searchBar.classList.remove('shake');
    if (!filteredContacts.length) {
      this.view.searchBar.classList.add('shake');
    }
  }

  handleCancelClick(e) {
    this.view.newContactForm.reset();
    this.view.clearInvalidMessages();
    this.view.displayContacts(this.model.filterContacts(this.view.searchBar.value));
  }

  async handleInputChange(e) {
    let id = e.target.parentNode.dataset.id;
    let key = e.target.getAttribute('name');
    let value = e.target.value;
    await this.model.updateContact(id, { [key]: value });
  }

  handleAddTag(e) {
    if (e.key === 'Enter') {
      this.model.addTag(e.target.value);
      this.view.addTag(e.target.value);
      e.target.value = "";
    }
  }

  handleTagFilter(e) {
    if (e.target.tagName === 'SPAN') {
      this.view.clearPreviouslyActiveTag(e.target);

      if (e.target.classList.contains('active')) {
        e.target.classList.remove('active');
        this.view.displayContacts(this.model.getContacts());
      } else {
        e.target.classList.add('active');
        let tag = e.target.dataset.tag;
        let filteredContacts = this.model.filterByTag(tag);
        this.view.displayContacts(filteredContacts);
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ContactsController(new ContactsModel(), new ContactsView());
});