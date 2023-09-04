const validators = {
  hasContent: {
      f: input => {
        return input.length > 0;
      },
      msg: 'Requires content'
  },
  email: {
    f: input => {
      return /[a-z/d]+@[a-z]+.com/gi.test(input);
    },
    msg: 'Invalid email'
  },
  phone: {
    f: input => {
      return /\d{10}/gi.test(input);
    },
    msg: 'Invalid phone number'
  }
}

export default function isValid(form) {
  let isValid = true;
  
  let inputs = Array.from(form.elements).filter(el => el.classList.contains('standard-input'));
  inputs.forEach(el => {
    let chosenValidators = el.dataset.validate.split(" ");
    chosenValidators.forEach(validator => {
      let { f, msg } = validators[validator];
      if (!f(el.value)) {
        el.nextElementSibling.textContent = msg;
        isValid = false;
      }
    });
  });
  return isValid;
}